import { describe, expect, it } from "vitest";
import {
  buildFirmwareFrame,
  clientCommandSchema,
  parseFirmwareFrame,
  toAlertEvent
} from "./index.js";

describe("protocol schemas", () => {
  it("accepts valid START_SESSION command", () => {
    const command = {
      type: "START_SESSION",
      token: "test-token-123",
      payload: {
        durationSec: 60
      }
    };

    const result = clientCommandSchema.safeParse(command);
    expect(result.success).toBe(true);
  });

  it("rejects malformed command payload", () => {
    const command = {
      type: "START_SESSION",
      token: "test-token-123",
      payload: {
        durationSec: "60"
      }
    };

    const result = clientCommandSchema.safeParse(command);
    expect(result.success).toBe(false);
  });
});

describe("firmware parser", () => {
  it("parses line-delimited firmware frame", () => {
    const raw = buildFirmwareFrame("evt-1", "gas", 12345);
    const parsed = parseFirmwareFrame(raw);

    expect(parsed).toEqual({
      eventId: "evt-1",
      alertType: "gas",
      deviceTsMs: 12345
    });
  });

  it("returns null for unknown format", () => {
    const parsed = parseFirmwareFrame("INVALID|frame");
    expect(parsed).toBeNull();
  });

  it("creates canonical ALERT event", () => {
    const event = toAlertEvent({
      eventId: "evt-22",
      alertType: "maintenance",
      deviceTsMs: 1000,
      receivedTsMs: 1012,
      source: "simulator"
    });

    expect(event.type).toBe("ALERT");
    expect(event.payload.alertType).toBe("maintenance");
  });
});
