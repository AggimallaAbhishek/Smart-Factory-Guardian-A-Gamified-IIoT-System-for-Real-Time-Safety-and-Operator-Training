import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomDoc } from "./types";
import { __resetResponseMarkersForTests, submitResponse } from "./responseService";

const submitResponseMock = vi.fn(async () => undefined);

vi.mock("./repository", () => {
  return {
    getRoomRepository: () => ({
      submitResponse: submitResponseMock
    })
  };
});

function roomFixture(): RoomDoc {
  return {
    hostUid: "host",
    status: "running",
    turnDurationSec: 60,
    activePlayerUid: "u1",
    turnStartedAtMs: 1_000,
    turnEndsAtMs: 61_000,
    turnNumber: 1,
    activeAlert: {
      alertId: "alert-1",
      type: "gas",
      issuedAtMs: 2_000,
      source: "mock",
      turnNumber: 1,
      turnOwnerUid: "u1"
    },
    lastHostHeartbeatMs: 900,
    createdAtMs: 100,
    endedAtMs: null,
    playerQueue: ["u1", "u2"]
  };
}

describe("responseService", () => {
  beforeEach(() => {
    submitResponseMock.mockClear();
    __resetResponseMarkersForTests();
  });

  it("accepts first valid submission", async () => {
    const outcome = await submitResponse("ROOM01", "u1", roomFixture(), "gas", 2_300);
    expect(outcome.accepted).toBe(true);
    expect(submitResponseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate submission for same alert window", async () => {
    await submitResponse("ROOM01", "u1", roomFixture(), "gas", 2_300);
    const duplicate = await submitResponse("ROOM01", "u1", roomFixture(), "gas", 2_450);

    expect(duplicate).toEqual({
      accepted: false,
      reason: "duplicate_or_rate_limited"
    });
    expect(submitResponseMock).toHaveBeenCalledTimes(1);
  });
});
