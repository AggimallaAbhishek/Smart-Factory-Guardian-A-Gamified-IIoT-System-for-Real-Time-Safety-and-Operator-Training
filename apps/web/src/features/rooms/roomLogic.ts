import {
  computeLeaderboard,
  computeUpdatedStats,
  createEmptyStats,
  pickNextActivePlayer,
  sortQueueParticipants,
  type LeaderboardCandidate,
  type QueueParticipant
} from "@guardian/domain";
import type { AlertType } from "@guardian/protocol";
import { TURN_TRANSITION_MIN_SEC, TURN_TRANSITION_MAX_SEC } from "./constants";
import type { LeaderboardEntry, RoomDoc, RoomPlayerDoc } from "./types";

export function createPlayerDocument(uid: string, displayName: string, queueOrder: number, nowMs: number): RoomPlayerDoc {
  return {
    uid,
    displayName,
    joinedAtMs: nowMs,
    queueOrder,
    isConnected: true,
    ...createEmptyStats()
  };
}

export function buildQueueParticipants(players: RoomPlayerDoc[], hostUid?: string): QueueParticipant[] {
  // Include all players including host in the game queue
  return players.map((player) => ({
    uid: player.uid,
    queueOrder: player.queueOrder,
    isConnected: player.isConnected
  }));
}

export function chooseNextTurnOwner(players: RoomPlayerDoc[], currentActiveUid: string | null, hostUid?: string) {
  return pickNextActivePlayer(buildQueueParticipants(players, hostUid), currentActiveUid);
}

export function applyAlertOutcome(
  player: RoomPlayerDoc,
  outcome: "correct" | "wrong" | "miss",
  responseTimeMs?: number
): RoomPlayerDoc {
  const updated = computeUpdatedStats(player, outcome, responseTimeMs);
  return {
    ...player,
    ...updated
  };
}

export function startTurn(room: RoomDoc, nextUid: string, nowMs: number): RoomDoc {
  const endsAt = nowMs + room.turnDurationSec * 1000;
  return {
    ...room,
    status: "running",
    activePlayerUid: nextUid,
    turnStartedAtMs: nowMs,
    turnEndsAtMs: endsAt,
    turnNumber: room.turnNumber + 1,
    activeAlert: null,
    nextPlayerUid: null,
    turnTransitionEndsAtMs: null
  };
}

export function startTurnTransition(room: RoomDoc, nextUid: string, nowMs: number): RoomDoc {
  const transitionDurationSec = Math.floor(
    Math.random() * (TURN_TRANSITION_MAX_SEC - TURN_TRANSITION_MIN_SEC + 1) + TURN_TRANSITION_MIN_SEC
  );
  const transitionEnds = nowMs + transitionDurationSec * 1000;

  return {
    ...room,
    activePlayerUid: null,
    turnStartedAtMs: null,
    turnEndsAtMs: null,
    activeAlert: null,
    nextPlayerUid: nextUid,
    turnTransitionEndsAtMs: transitionEnds
  };
}

export function clearActiveAlert(room: RoomDoc): RoomDoc {
  return {
    ...room,
    activeAlert: null
  };
}

export function createAlertPayload(
  alertType: AlertType,
  source: "bridge" | "mock",
  room: RoomDoc,
  nowMs: number
) {
  if (!room.activePlayerUid) {
    return null;
  }

  return {
    alertId: `alert-${nowMs}-${Math.random().toString(16).slice(2, 7)}`,
    type: alertType,
    issuedAtMs: nowMs,
    source,
    turnNumber: room.turnNumber,
    turnOwnerUid: room.activePlayerUid
  };
}

export function computeLeaderboardEntries(players: RoomPlayerDoc[], hostUid?: string): LeaderboardEntry[] {
  // Include all players including host in leaderboard
  const eligiblePlayers = players;
  
  const candidates: LeaderboardCandidate[] = eligiblePlayers.map((player) => ({
    uid: player.uid,
    displayName: player.displayName,
    totalScore: player.totalScore,
    avgResponseMs: player.avgResponseMs,
    joinedAtMs: player.joinedAtMs
  }));

  return computeLeaderboard(candidates).map((candidate, index) => {
    const player = eligiblePlayers.find((entry) => entry.uid === candidate.uid)!;
    return {
      uid: candidate.uid,
      displayName: candidate.displayName,
      totalScore: candidate.totalScore,
      avgResponseMs: candidate.avgResponseMs,
      accuracy: player.accuracy,
      joinedAtMs: candidate.joinedAtMs,
      rank: index + 1
    };
  });
}

export function sortPlayersByQueue(players: RoomPlayerDoc[], hostUid?: string): RoomPlayerDoc[] {
  // Include all players including host in queue sorting
  const eligiblePlayers = players;
  const queue = sortQueueParticipants(buildQueueParticipants(eligiblePlayers));
  return queue
    .map((participant) => eligiblePlayers.find((player) => player.uid === participant.uid))
    .filter((player): player is RoomPlayerDoc => Boolean(player));
}

export function findEarliestConnectedPlayer(players: RoomPlayerDoc[], hostUid?: string) {
  // Include all connected players including host when finding next player
  const connected = players.filter((player) => player.isConnected);
  if (connected.length === 0) {
    return null;
  }

  return [...connected].sort((left, right) => {
    if (left.queueOrder !== right.queueOrder) {
      return left.queueOrder - right.queueOrder;
    }

    return left.joinedAtMs - right.joinedAtMs;
  })[0] ?? null;
}

export function hasAllPlayersCompletedTurn(players: RoomPlayerDoc[], completedPlayerUids: string[], hostUid?: string): boolean {
  const eligiblePlayers = players.filter((p) => p.isConnected);
  return eligiblePlayers.every(player => completedPlayerUids.includes(player.uid));
}
