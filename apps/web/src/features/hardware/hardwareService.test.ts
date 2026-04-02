import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startMock } from "./hardwareService";

describe("hardwareService startMock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits alerts on configured interval and stops cleanly", () => {
    const alerts: Array<{ type: string; ts: number }> = [];
    const statuses: string[] = [];

    const controller = startMock(
      {
        minIntervalMs: 2_000,
        maxIntervalMs: 2_000
      },
      {
        onAlert: (alertType, timestampMs) => {
          alerts.push({
            type: alertType,
            ts: timestampMs
          });
        },
        onStatus: (status) => {
          statuses.push(status.message);
        }
      }
    );

    expect(statuses[0]).toContain("running");

    vi.advanceTimersByTime(2_000);
    expect(alerts.length).toBe(1);

    vi.advanceTimersByTime(2_000);
    expect(alerts.length).toBe(2);

    controller.stop();
    const countAtStop = alerts.length;
    vi.advanceTimersByTime(10_000);

    expect(alerts.length).toBe(countAtStop);
    expect(statuses[statuses.length - 1]).toContain("stopped");
  });
});
