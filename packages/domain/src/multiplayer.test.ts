import { describe, expect, it } from "vitest";
import {
  computeLeaderboard,
  computeUpdatedStats,
  createEmptyStats,
  pickNextActivePlayer,
  sortQueueParticipants
} from "./multiplayer.js";

describe("sortQueueParticipants", () => {
  it("orders players by queue index", () => {
    const sorted = sortQueueParticipants([
      { uid: "b", queueOrder: 2, isConnected: true },
      { uid: "a", queueOrder: 1, isConnected: true }
    ]);

    expect(sorted.map((participant) => participant.uid)).toEqual(["a", "b"]);
  });
});

describe("pickNextActivePlayer", () => {
  it("picks the first connected when there is no active player", () => {
    const nextUid = pickNextActivePlayer(
      [
        { uid: "a", queueOrder: 0, isConnected: true },
        { uid: "b", queueOrder: 1, isConnected: true }
      ],
      null
    );

    expect(nextUid).toBe("a");
  });

  it("skips disconnected players", () => {
    const nextUid = pickNextActivePlayer(
      [
        { uid: "a", queueOrder: 0, isConnected: true },
        { uid: "b", queueOrder: 1, isConnected: false },
        { uid: "c", queueOrder: 2, isConnected: true }
      ],
      "a"
    );

    expect(nextUid).toBe("c");
  });
});

describe("computeUpdatedStats", () => {
  it("updates aggregate metrics for correct responses", () => {
    const stats = computeUpdatedStats(createEmptyStats(), "correct", 420);
    expect(stats.totalScore).toBe(10);
    expect(stats.correctCount).toBe(1);
    expect(stats.avgResponseMs).toBe(420);
    expect(stats.accuracy).toBe(100);
  });

  it("updates miss without response metrics", () => {
    const stats = computeUpdatedStats(createEmptyStats(), "miss");
    expect(stats.totalScore).toBe(0);
    expect(stats.missCount).toBe(1);
    expect(stats.responseCount).toBe(0);
  });
});

describe("computeLeaderboard", () => {
  it("ranks by score desc then average response asc", () => {
    const leaderboard = computeLeaderboard([
      { uid: "u1", displayName: "A", totalScore: 40, avgResponseMs: 500, joinedAtMs: 10 },
      { uid: "u2", displayName: "B", totalScore: 50, avgResponseMs: 700, joinedAtMs: 11 },
      { uid: "u3", displayName: "C", totalScore: 40, avgResponseMs: 300, joinedAtMs: 12 }
    ]);

    expect(leaderboard.map((item) => item.uid)).toEqual(["u2", "u3", "u1"]);
  });
});
