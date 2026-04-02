import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomDoc } from "./types";

const submitResponseMock = vi.hoisted(() => vi.fn());

vi.mock("./repository", () => ({
  getRoomRepository: () => ({
    submitResponse: submitResponseMock
  })
}));

function roomFixture(): RoomDoc {
  return {
    hostUid: "host",
    status: "running",
    turnDurationSec: 60,
    activePlayerUid: "host",
    turnStartedAtMs: 1000,
    turnEndsAtMs: 61000,
    turnNumber: 1,
    activeAlert: {
      alertId: "alert-1",
      type: "gas",
      issuedAtMs: 10_000,
      source: "mock",
      turnNumber: 1,
      turnOwnerUid: "host"
    },
    lastHostHeartbeatMs: 1000,
    createdAtMs: 1000,
    endedAtMs: null,
    playerQueue: ["host", "guest"]
  };
}

describe("responseService", () => {
  beforeEach(async () => {
    submitResponseMock.mockReset().mockResolvedValue(undefined);
    const module = await import("./responseService");
    module.__resetResponseMarkersForTests();
  });

  it("rejects non-active player responses", async () => {
    const module = await import("./responseService");
    const room = roomFixture();

    await expect(module.submitResponse("ROOM1", "guest", room, "gas", 12_000)).rejects.toThrow(
      "Only active player can submit response."
    );
    expect(submitResponseMock).not.toHaveBeenCalled();
  });

  it("prevents rapid duplicate submissions for same actor", async () => {
    const module = await import("./responseService");
    const room = roomFixture();

    const first = await module.submitResponse("ROOM1", "host", room, "gas", 12_000);
    const duplicate = await module.submitResponse("ROOM1", "host", room, "gas", 12_050);

    expect(first.accepted).toBe(true);
    expect(duplicate).toEqual({
      accepted: false,
      reason: "duplicate_or_rate_limited"
    });
    expect(submitResponseMock).toHaveBeenCalledTimes(1);
  });

  it("accepts valid active-player responses", async () => {
    const module = await import("./responseService");
    const room = roomFixture();

    const result = await module.submitResponse("ROOM1", "host", room, "gas", 12_300);

    expect(result).toEqual({
      accepted: true
    });
    expect(submitResponseMock).toHaveBeenCalledWith("ROOM1", "host", "gas", 12_300);
  });
});
