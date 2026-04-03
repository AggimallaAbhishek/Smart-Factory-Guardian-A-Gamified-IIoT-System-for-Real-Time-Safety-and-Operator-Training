import type { AlertType } from "@guardian/protocol";
import { logger } from "../../lib/logger";
import {
  applyAlertOutcome,
  chooseNextTurnOwner,
  createAlertPayload,
  findEarliestConnectedPlayer,
  hasAllPlayersCompletedTurn,
  startTurn,
  startTurnTransition
} from "./roomLogic";
import type { HardwareSource, RoomDoc, RoomEventType, RoomPlayerDoc } from "./types";

export interface EngineEvent {
  type: RoomEventType;
  actorUid: string;
  timestampMs: number;
  payload: Record<string, unknown>;
}

export interface EngineState {
  room: RoomDoc;
  players: Record<string, RoomPlayerDoc>;
}

export function advanceTurnState(
  state: EngineState,
  actorUid: string,
  timestampMs: number,
  reason: "force" | "timeout" | "disconnect"
) {
  const events: EngineEvent[] = [];
  const players = { ...state.players };
  let room = { ...state.room };

  const activePlayerUid = room.activePlayerUid;
  
  // Mark current player as completed if they had a turn
  if (activePlayerUid && !room.playersCompletedTurn.includes(activePlayerUid)) {
    room.playersCompletedTurn = [...room.playersCompletedTurn, activePlayerUid];
  }

  if (room.activeAlert && activePlayerUid && players[activePlayerUid]) {
    players[activePlayerUid] = applyAlertOutcome(players[activePlayerUid], "miss");
    events.push({
      type: "response",
      actorUid,
      timestampMs,
      payload: {
        alertId: room.activeAlert.alertId,
        outcome: "miss",
        targetUid: activePlayerUid,
        reason: "unanswered_before_turn_advance"
      }
    });
  }

  // Check if all players have completed their turn
  if (hasAllPlayersCompletedTurn(Object.values(players), room.playersCompletedTurn, room.hostUid)) {
    // All players finished - end the game
    room = {
      ...room,
      status: "ended",
      endedAtMs: timestampMs,
      activePlayerUid: null,
      turnStartedAtMs: null,
      turnEndsAtMs: null,
      activeAlert: null,
      nextPlayerUid: null,
      turnTransitionEndsAtMs: null
    };

    events.push({
      type: "room_ended",
      actorUid,
      timestampMs,
      payload: {
        reason: "all_players_completed"
      }
    });

    logger.info("All players completed their turns, ending game", {
      actorUid,
      completedCount: room.playersCompletedTurn.length
    });

    return { room, players, events };
  }

  // Host doesn't play - exclude from queue when choosing next player
  const nextUid = chooseNextTurnOwner(Object.values(players), room.activePlayerUid, room.hostUid);
  if (!nextUid) {
    room = {
      ...room,
      activePlayerUid: null,
      turnStartedAtMs: null,
      turnEndsAtMs: null,
      activeAlert: null,
      nextPlayerUid: null,
      turnTransitionEndsAtMs: null
    };

    events.push({
      type: "turn_advanced",
      actorUid,
      timestampMs,
      payload: {
        previousUid: activePlayerUid,
        nextUid: null,
        reason
      }
    });

    return { room, players, events };
  }

  const nextPlayer = players[nextUid];
  if (!nextPlayer) {
    throw new Error("Next player was not found in player map.");
  }

  players[nextUid] = {
    ...nextPlayer,
    turnsPlayed: nextPlayer.turnsPlayed + 1
  };

  // Start turn transition (10-15 sec countdown)
  room = startTurnTransition(room, nextUid, timestampMs);

  events.push({
    type: reason === "disconnect" ? "turn_skipped_disconnected" : "turn_advanced",
    actorUid,
    timestampMs,
    payload: {
      previousUid: activePlayerUid,
      nextUid,
      reason,
      transitionEndsAtMs: room.turnTransitionEndsAtMs
    }
  });

  logger.debug("Turn transition started", {
    actorUid,
    reason,
    previousUid: activePlayerUid,
    nextUid,
    transitionEndsAtMs: room.turnTransitionEndsAtMs
  });

  return { room, players, events };
}

export function completeTurnTransition(state: EngineState, actorUid: string, timestampMs: number) {
  const events: EngineEvent[] = [];
  const players = { ...state.players };
  let room = { ...state.room };

  const nextUid = room.nextPlayerUid;
  if (!nextUid) {
    return { room, players, events };
  }

  // Start actual turn
  room = startTurn(room, nextUid, timestampMs);

  events.push({
    type: "turn_started",
    actorUid,
    timestampMs,
    payload: {
      activePlayerUid: nextUid,
      turnNumber: room.turnNumber
    }
  });

  logger.debug("Turn started after transition", {
    actorUid,
    activePlayerUid: nextUid,
    turnNumber: room.turnNumber
  });

  return { room, players, events };
}

export function publishAlertState(
  state: EngineState,
  actorUid: string,
  alertType: AlertType,
  source: HardwareSource,
  timestampMs: number
) {
  const events: EngineEvent[] = [];
  const players = { ...state.players };
  let room = { ...state.room };

  if (room.status !== "running") {
    return { room, players, events };
  }

  const activeUid = room.activePlayerUid;
  if (room.activeAlert && activeUid && players[activeUid]) {
    players[activeUid] = applyAlertOutcome(players[activeUid], "miss");
    events.push({
      type: "response",
      actorUid,
      timestampMs,
      payload: {
        alertId: room.activeAlert.alertId,
        outcome: "miss",
        targetUid: activeUid,
        reason: "new_alert_before_response"
      }
    });
  }

  const alertPayload = createAlertPayload(alertType, source, room, timestampMs);
  if (!alertPayload) {
    return { room, players, events };
  }

  room = {
    ...room,
    activeAlert: alertPayload
  };

  events.push({
    type: "alert",
    actorUid,
    timestampMs,
    payload: alertPayload
  });

  logger.debug("Alert published", {
    actorUid,
    alertId: alertPayload.alertId,
    alertType,
    turnOwnerUid: alertPayload.turnOwnerUid
  });

  return { room, players, events };
}

export function submitResponseState(
  state: EngineState,
  actorUid: string,
  responseType: AlertType,
  timestampMs: number
) {
  const room = { ...state.room };
  const players = { ...state.players };

  if (!room.activeAlert) {
    throw new Error("No active alert available for response.");
  }

  if (room.activeAlert.turnOwnerUid !== actorUid || room.activePlayerUid !== actorUid) {
    throw new Error("Only active player can respond to alert.");
  }

  const actor = players[actorUid];
  if (!actor) {
    throw new Error("Responder player profile was not found.");
  }

  const outcome = responseType === room.activeAlert.type ? "correct" : "wrong";
  const responseTimeMs = Math.max(0, timestampMs - room.activeAlert.issuedAtMs);

  players[actorUid] = applyAlertOutcome(actor, outcome, responseTimeMs);

  const nextRoom: RoomDoc = {
    ...room,
    activeAlert: null
  };

  const events: EngineEvent[] = [
    {
      type: "response",
      actorUid,
      timestampMs,
      payload: {
        alertId: room.activeAlert.alertId,
        outcome,
        responseTimeMs,
        expectedType: room.activeAlert.type,
        responseType
      }
    }
  ];

  logger.debug("Alert response accepted", {
    actorUid,
    outcome,
    responseTimeMs
  });

  return {
    room: nextRoom,
    players,
    events
  };
}

export function transferHostIfStaleState(
  state: EngineState,
  actorUid: string,
  timestampMs: number,
  staleThresholdMs: number
) {
  const room = { ...state.room };
  const players = { ...state.players };

  if (timestampMs - room.lastHostHeartbeatMs <= staleThresholdMs) {
    return {
      room,
      players,
      transferred: false,
      event: null as EngineEvent | null
    };
  }

  const nextHost = findEarliestConnectedPlayer(Object.values(players));
  if (!nextHost) {
    return {
      room,
      players,
      transferred: false,
      event: null as EngineEvent | null
    };
  }

  room.hostUid = nextHost.uid;
  room.lastHostHeartbeatMs = timestampMs;

  const event: EngineEvent = {
    type: "host_transferred",
    actorUid,
    timestampMs,
    payload: {
      previousHostUid: state.room.hostUid,
      nextHostUid: nextHost.uid
    }
  };

  logger.warn("Host transferred after stale heartbeat", {
    actorUid,
    previousHostUid: state.room.hostUid,
    nextHostUid: nextHost.uid
  });

  return {
    room,
    players,
    transferred: state.room.hostUid !== nextHost.uid,
    event
  };
}
