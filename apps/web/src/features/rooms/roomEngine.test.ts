import { describe, expect, it } from "vitest";
import { createPlayerDocument } from "./roomLogic";
import { advanceTurnState, publishAlertState, submitResponseState, transferHostIfStaleState } from "./roomEngine";
import type { RoomDoc } from "./types";

function roomFixture(): RoomDoc {
  return {
    hostUid: "host",
    status: "running",
    turnDurationSec: 60,
    activePlayerUid: "host",
    turnStartedAtMs: 1000,
    turnEndsAtMs: 61_000,
    turnNumber: 1,
    activeAlert: null,
    lastHostHeartbeatMs: 1_000,
    createdAtMs: 100,
    endedAtMs: null,
    playerQueue: ["host", "guest"],
    nextPlayerUid: null,
    turnTransitionEndsAtMs: null,
    playersCompletedTurn: []
  };
}

describe("roomEngine alert and response", () => {
  it("publishes alert and accepts response for active player", () => {
    const players = {
      host: createPlayerDocument("host", "Host", 0, 1000),
      guest: createPlayerDocument("guest", "Guest", 1, 1000)
    };

    const published = publishAlertState(
      { room: roomFixture(), players },
      "host",
      "gas",
      "mock",
      2_000
    );

    expect(published.room.activeAlert?.type).toBe("gas");

    const responded = submitResponseState(published, "host", "gas", 2_350);
    expect(responded.players.host!.totalScore).toBe(10);
    expect(responded.players.host!.avgResponseMs).toBe(350);
    expect(responded.room.activeAlert).toBeNull();
  });
});

describe("roomEngine turn advancement", () => {
  it("marks miss then advances on timeout", () => {
    const room = {
      ...roomFixture(),
      activeAlert: {
        alertId: "a-1",
        type: "gas" as const,
        issuedAtMs: 2_000,
        source: "mock" as const,
        turnNumber: 1,
        turnOwnerUid: "host"
      }
    };

    const players = {
      host: createPlayerDocument("host", "Host", 0, 1000),
      guest: createPlayerDocument("guest", "Guest", 1, 1000)
    };

    const advanced = advanceTurnState({ room, players }, "host", 62_000, "timeout");
    expect(advanced.players.host!.missCount).toBe(1);
    expect(advanced.room.activePlayerUid).toBe("guest");
  });
});

describe("roomEngine host transfer", () => {
  it("transfers host when heartbeat is stale", () => {
    const players = {
      host: {
        ...createPlayerDocument("host", "Host", 0, 1000),
        isConnected: false
      },
      guest: createPlayerDocument("guest", "Guest", 1, 1000)
    };

    const transfer = transferHostIfStaleState(
      {
        room: roomFixture(),
        players
      },
      "guest",
      30_000,
      15_000
    );

    expect(transfer.transferred).toBe(true);
    expect(transfer.room.hostUid).toBe("guest");
  });
});
