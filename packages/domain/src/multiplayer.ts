export interface QueueParticipant {
  uid: string;
  queueOrder: number;
  isConnected: boolean;
}

export interface PlayerAggregateStats {
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  missCount: number;
  responseCount: number;
  responseTimeTotalMs: number;
  avgResponseMs: number;
  accuracy: number;
  turnsPlayed: number;
}

export type OutcomeType = "correct" | "wrong" | "miss";

export interface LeaderboardCandidate {
  uid: string;
  displayName: string;
  totalScore: number;
  avgResponseMs: number;
  joinedAtMs: number;
}

export function sortQueueParticipants(participants: QueueParticipant[]): QueueParticipant[] {
  return [...participants].sort((left, right) => left.queueOrder - right.queueOrder);
}

export function pickNextActivePlayer(participants: QueueParticipant[], currentActiveUid: string | null) {
  const ordered = sortQueueParticipants(participants).filter((participant) => participant.isConnected);
  if (ordered.length === 0) {
    return null;
  }

  if (!currentActiveUid) {
    return ordered[0]?.uid ?? null;
  }

  const currentIndex = ordered.findIndex((participant) => participant.uid === currentActiveUid);
  if (currentIndex === -1) {
    return ordered[0]?.uid ?? null;
  }

  return ordered[(currentIndex + 1) % ordered.length]?.uid ?? null;
}

export function computeUpdatedStats(
  current: PlayerAggregateStats,
  outcome: OutcomeType,
  responseTimeMs?: number
): PlayerAggregateStats {
  const scoreDelta = outcome === "correct" ? 10 : outcome === "wrong" ? -5 : 0;
  const responseDelta = typeof responseTimeMs === "number" ? Math.max(responseTimeMs, 0) : 0;

  const next = {
    ...current,
    totalScore: current.totalScore + scoreDelta,
    correctCount: current.correctCount + (outcome === "correct" ? 1 : 0),
    wrongCount: current.wrongCount + (outcome === "wrong" ? 1 : 0),
    missCount: current.missCount + (outcome === "miss" ? 1 : 0),
    responseCount: current.responseCount + (typeof responseTimeMs === "number" ? 1 : 0),
    responseTimeTotalMs: current.responseTimeTotalMs + responseDelta
  };

  const attempts = next.correctCount + next.wrongCount + next.missCount;
  next.accuracy = attempts > 0 ? Number(((next.correctCount / attempts) * 100).toFixed(2)) : 0;
  next.avgResponseMs =
    next.responseCount > 0 ? Number((next.responseTimeTotalMs / next.responseCount).toFixed(2)) : 0;

  return next;
}

export function createEmptyStats(): PlayerAggregateStats {
  return {
    totalScore: 0,
    correctCount: 0,
    wrongCount: 0,
    missCount: 0,
    responseCount: 0,
    responseTimeTotalMs: 0,
    avgResponseMs: 0,
    accuracy: 0,
    turnsPlayed: 0
  };
}

export function computeLeaderboard(candidates: LeaderboardCandidate[]) {
  return [...candidates].sort((left, right) => {
    if (right.totalScore !== left.totalScore) {
      return right.totalScore - left.totalScore;
    }

    if (left.avgResponseMs !== right.avgResponseMs) {
      return left.avgResponseMs - right.avgResponseMs;
    }

    return left.joinedAtMs - right.joinedAtMs;
  });
}
