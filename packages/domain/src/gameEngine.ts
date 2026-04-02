import type { AlertEvent, AlertType, PlayerSession, SessionEvent } from "@guardian/protocol";

export const DEFAULT_DURATION_SEC = 60;
const CORRECT_POINTS = 10;
const WRONG_POINTS = -5;

export interface ActiveAlert {
  eventId: string;
  alertType: AlertType;
  deviceTsMs: number;
  receivedTsMs: number;
}

export interface GameState {
  status: "idle" | "running" | "stopped";
  durationSec: number;
  remainingSec: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
  score: number;
  events: SessionEvent[];
  activeAlert: ActiveAlert | null;
}

export function createInitialGameState(durationSec = DEFAULT_DURATION_SEC): GameState {
  return {
    status: "idle",
    durationSec,
    remainingSec: durationSec,
    startedAtMs: null,
    endedAtMs: null,
    score: 0,
    events: [],
    activeAlert: null
  };
}

export function startSession(
  previousState: GameState,
  startedAtMs: number,
  durationSec = previousState.durationSec
): GameState {
  return {
    ...createInitialGameState(durationSec),
    status: "running",
    startedAtMs,
    remainingSec: durationSec
  };
}

export function connectAlert(previousState: GameState, alert: AlertEvent): GameState {
  if (previousState.status !== "running") {
    return previousState;
  }

  let nextState = previousState;
  if (previousState.activeAlert) {
    nextState = recordOutcome(previousState, {
      eventId: previousState.activeAlert.eventId,
      alertType: previousState.activeAlert.alertType,
      outcome: "miss"
    });
  }

  return {
    ...nextState,
    activeAlert: {
      eventId: alert.eventId,
      alertType: alert.alertType,
      deviceTsMs: alert.deviceTsMs,
      receivedTsMs: alert.receivedTsMs
    }
  };
}

export function submitResponse(previousState: GameState, clickedAlertType: AlertType, nowMs: number): GameState {
  if (previousState.status !== "running") {
    return previousState;
  }

  if (!previousState.activeAlert) {
    return recordOutcome(previousState, {
      eventId: `manual-${nowMs}`,
      alertType: clickedAlertType,
      outcome: "wrong"
    });
  }

  const outcome = clickedAlertType === previousState.activeAlert.alertType ? "correct" : "wrong";
  const responseTimeMs = Math.max(0, nowMs - previousState.activeAlert.receivedTsMs);

  return {
    ...recordOutcome(previousState, {
      eventId: previousState.activeAlert.eventId,
      alertType: previousState.activeAlert.alertType,
      outcome,
      responseTimeMs
    }),
    activeAlert: null
  };
}

export function tickSession(previousState: GameState, nowMs: number): GameState {
  if (previousState.status !== "running" || previousState.startedAtMs === null) {
    return previousState;
  }

  const elapsedSec = Math.floor((nowMs - previousState.startedAtMs) / 1000);
  const remainingSec = Math.max(0, previousState.durationSec - elapsedSec);

  if (remainingSec > 0) {
    return {
      ...previousState,
      remainingSec
    };
  }

  return stopSession({
    ...previousState,
    remainingSec
  }, nowMs);
}

export function stopSession(previousState: GameState, endedAtMs: number): GameState {
  if (previousState.status !== "running") {
    return previousState;
  }

  let nextState = previousState;
  if (previousState.activeAlert) {
    nextState = recordOutcome(previousState, {
      eventId: previousState.activeAlert.eventId,
      alertType: previousState.activeAlert.alertType,
      outcome: "miss"
    });
  }

  return {
    ...nextState,
    status: "stopped",
    endedAtMs,
    remainingSec: 0,
    activeAlert: null
  };
}

export function toPlayerSession(state: GameState, playerId: string, playerName: string): PlayerSession {
  const startedAtMs = state.startedAtMs ?? Date.now();
  const endedAtMs = state.endedAtMs ?? Date.now();

  return {
    id: playerId,
    name: playerName,
    durationSec: state.durationSec,
    startedAtMs,
    endedAtMs,
    score: state.score,
    accuracy: calculateAccuracy(state.events),
    avgResponseMs: calculateAverageResponseMs(state.events),
    events: state.events
  };
}

export function calculateAccuracy(events: SessionEvent[]): number {
  if (events.length === 0) {
    return 0;
  }

  const correctCount = events.filter((event) => event.outcome === "correct").length;
  return Number(((correctCount / events.length) * 100).toFixed(2));
}

export function calculateAverageResponseMs(events: SessionEvent[]): number {
  const responseTimes = events
    .map((event) => event.responseTimeMs)
    .filter((value): value is number => typeof value === "number");

  if (responseTimes.length === 0) {
    return 0;
  }

  const total = responseTimes.reduce((sum, current) => sum + current, 0);
  return Number((total / responseTimes.length).toFixed(2));
}

function recordOutcome(
  previousState: GameState,
  event: {
    eventId: string;
    alertType: AlertType;
    outcome: "correct" | "wrong" | "miss";
    responseTimeMs?: number;
  }
): GameState {
  const scoreDelta =
    event.outcome === "correct" ? CORRECT_POINTS : event.outcome === "wrong" ? WRONG_POINTS : 0;

  return {
    ...previousState,
    score: previousState.score + scoreDelta,
    events: [
      ...previousState.events,
      {
        eventId: event.eventId,
        alertType: event.alertType,
        outcome: event.outcome,
        responseTimeMs: event.responseTimeMs
      }
    ]
  };
}
