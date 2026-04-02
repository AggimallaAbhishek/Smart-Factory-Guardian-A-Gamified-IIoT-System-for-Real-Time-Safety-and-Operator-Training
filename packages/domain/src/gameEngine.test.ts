import { describe, expect, it } from "vitest";
import type { AlertEvent } from "@guardian/protocol";
import {
  calculateAccuracy,
  calculateAverageResponseMs,
  connectAlert,
  createInitialGameState,
  startSession,
  stopSession,
  submitResponse,
  tickSession,
  toPlayerSession
} from "./gameEngine.js";

function createAlert(partial: Partial<AlertEvent>): AlertEvent {
  return {
    eventId: partial.eventId ?? "evt-1",
    alertType: partial.alertType ?? "gas",
    deviceTsMs: partial.deviceTsMs ?? 1000,
    receivedTsMs: partial.receivedTsMs ?? 1005,
    source: partial.source ?? "simulator"
  };
}

describe("gameEngine scoring", () => {
  it("awards +10 on correct response", () => {
    const started = startSession(createInitialGameState(60), 0, 60);
    const withAlert = connectAlert(started, createAlert({ alertType: "gas", eventId: "evt-1" }));
    const updated = submitResponse(withAlert, "gas", 1300);

    expect(updated.score).toBe(10);
    expect(updated.events[0]?.outcome).toBe("correct");
    expect(updated.events[0]?.responseTimeMs).toBe(295);
  });

  it("applies -5 when clicking with no active alert", () => {
    const started = startSession(createInitialGameState(60), 0, 60);
    const updated = submitResponse(started, "maintenance", 2000);

    expect(updated.score).toBe(-5);
    expect(updated.events[0]?.outcome).toBe("wrong");
  });

  it("marks previous alert as miss when next alert arrives", () => {
    const started = startSession(createInitialGameState(60), 0, 60);
    const first = connectAlert(started, createAlert({ eventId: "evt-1", alertType: "gas" }));
    const second = connectAlert(first, createAlert({ eventId: "evt-2", alertType: "temperature" }));

    expect(second.events).toHaveLength(1);
    expect(second.events[0]?.eventId).toBe("evt-1");
    expect(second.events[0]?.outcome).toBe("miss");
  });
});

describe("gameEngine timing and summary", () => {
  it("stops session at timer end and records miss for unresolved alert", () => {
    const started = startSession(createInitialGameState(3), 0, 3);
    const withAlert = connectAlert(started, createAlert({ eventId: "evt-9", alertType: "temperature" }));
    const finished = tickSession(withAlert, 3100);

    expect(finished.status).toBe("stopped");
    expect(finished.events[0]?.outcome).toBe("miss");
  });

  it("calculates accuracy and average response time", () => {
    const started = startSession(createInitialGameState(60), 0, 60);
    const a1 = connectAlert(started, createAlert({ eventId: "evt-1", alertType: "gas", receivedTsMs: 1000 }));
    const a1Resolved = submitResponse(a1, "gas", 1300);

    const a2 = connectAlert(a1Resolved, createAlert({ eventId: "evt-2", alertType: "maintenance", receivedTsMs: 2000 }));
    const a2Resolved = submitResponse(a2, "gas", 2500);

    const stopped = stopSession(a2Resolved, 5000);
    const summary = toPlayerSession(stopped, "p-1", "Asha");

    expect(calculateAccuracy(stopped.events)).toBe(50);
    expect(calculateAverageResponseMs(stopped.events)).toBe(400);
    expect(summary.score).toBe(5);
  });
});
