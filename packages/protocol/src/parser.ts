import { alertEventSchema, firmwareFrameSchema } from "./schemas.js";
import type { AlertType, SourceType } from "./types.js";

const FRAME_PREFIX = "EVT";

export function parseFirmwareFrame(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split("|");
  if (parts.length !== 4 || parts[0] !== FRAME_PREFIX) {
    return null;
  }

  const parsed = firmwareFrameSchema.safeParse({
    eventId: parts[1],
    alertType: parts[2],
    deviceTsMs: Number(parts[3])
  });

  return parsed.success ? parsed.data : null;
}

export function buildFirmwareFrame(eventId: string, alertType: AlertType, deviceTsMs: number): string {
  return `${FRAME_PREFIX}|${eventId}|${alertType}|${deviceTsMs}`;
}

export function toAlertEvent(params: {
  eventId: string;
  alertType: AlertType;
  deviceTsMs: number;
  receivedTsMs: number;
  source: SourceType;
}) {
  const result = alertEventSchema.safeParse({
    type: "ALERT",
    payload: {
      eventId: params.eventId,
      alertType: params.alertType,
      deviceTsMs: params.deviceTsMs,
      receivedTsMs: params.receivedTsMs,
      source: params.source
    }
  });

  if (!result.success) {
    throw new Error(`Invalid alert event parameters: ${result.error.message}`);
  }

  return result.data;
}
