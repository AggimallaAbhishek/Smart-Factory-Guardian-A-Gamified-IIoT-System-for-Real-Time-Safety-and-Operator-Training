import { describe, expect, it } from "vitest";
import {
  applyAlertOutcome,
  chooseNextTurnOwner,
  computeLeaderboardEntries,
  createPlayerDocument,
  findEarliestConnectedPlayer,
  startTurn
} from "./roomLogic";
import type { RoomDoc } from "./types";

function roomFixture(): RoomDoc {
  return {
    hostUid: "host",
    status: "lobby",
    turnDurationSec: 60,
    activePlayerUid: null,
    turnStartedAtMs: null,
    turnEndsAtMs: null,
    turnNumber: 0,
    activeAlert: null,
    lastHostHeartbeatMs: 100,
    createdAtMs: 100,
    endedAtMs: null,
    playerQueue: ["host", "guest"]
  };
}

describe("roomLogic queue and turn behavior", () => {
  it("selects next connected player", () => {
    const host = createPlayerDocument("host", "Host", 0, 1000);
    const guest = createPlayerDocument("guest", "Guest", 1, 1001);
    guest.isConnected = false;
    const fallback = createPlayerDocument("fallback", "Fallback", 2, 1002);

    const nextUid = chooseNextTurnOwner([host, guest, fallback], "host");
    expect(nextUid).toBe("fallback");
  });

  it("starts turn with 60s window", () => {
    const started = startTurn(roomFixture(), "host", 1_000);
    expect(started.status).toBe("running");
    expect(started.turnEndsAtMs).toBe(61_000);
  });

  it("finds earliest connected candidate for host transfer", () => {
    const disconnectedHost = createPlayerDocument("host", "Host", 0, 1000);
    disconnectedHost.isConnected = false;
    const candidate = createPlayerDocument("p2", "P2", 1, 1001);
    const earliest = createPlayerDocument("p3", "P3", 1, 1000);

    const selected = findEarliestConnectedPlayer([candidate, disconnectedHost, earliest]);
    expect(selected?.uid).toBe("p3");
  });
});

describe("roomLogic scoring and ranking", () => {
  it("applies correct outcomes and calculates leaderboard tie-break", () => {
    const p1 = applyAlertOutcome(createPlayerDocument("u1", "U1", 0, 100), "correct", 450);
    const p2 = applyAlertOutcome(createPlayerDocument("u2", "U2", 1, 101), "correct", 300);

    const ranked = computeLeaderboardEntries([p1, p2]);
    expect(ranked[0]?.uid).toBe("u2");
    expect(ranked[1]?.uid).toBe("u1");
  });
});
