import type { AlertType } from "@guardian/protocol";
import { logger } from "../../lib/logger";
import { wrapRoomError } from "./errorMessages";
import { ensureFirebaseSessionReady } from "./firebaseSession";
import { getRoomRepository } from "./repository";
import { responseRequestSchema } from "./schemas";
import type { RoomDoc } from "./types";

const DUPLICATE_ALERT_WINDOW_MS = 1_500;
const SUBMISSION_INTERVAL_MS = 120;

interface SubmissionMarker {
  alertId: string;
  timestampMs: number;
}

const responseMarkers = new Map<string, SubmissionMarker>();

function markerKey(roomId: string, actorUid: string) {
  return `${roomId}:${actorUid}`;
}

function shouldReject(roomId: string, actorUid: string, alertId: string, timestampMs: number) {
  const previous = responseMarkers.get(markerKey(roomId, actorUid));
  if (!previous) {
    return false;
  }

  if (previous.alertId === alertId && timestampMs - previous.timestampMs <= DUPLICATE_ALERT_WINDOW_MS) {
    return true;
  }

  if (timestampMs - previous.timestampMs <= SUBMISSION_INTERVAL_MS) {
    return true;
  }

  return false;
}

export async function submitResponse(
  roomId: string,
  actorUid: string,
  room: RoomDoc,
  responseType: AlertType,
  timestampMs: number
) {
  responseRequestSchema.parse({
    roomId,
    actorUid,
    responseType,
    timestampMs
  });

  if (!room.activeAlert) {
    throw new Error("No active alert is available.");
  }

  if (room.activeAlert.turnOwnerUid !== actorUid || room.activePlayerUid !== actorUid) {
    throw new Error("Only active player can submit response.");
  }

  if (shouldReject(roomId, actorUid, room.activeAlert.alertId, timestampMs)) {
    logger.warn("Duplicate/rate-limited response rejected", {
      roomId,
      actorUid,
      alertId: room.activeAlert.alertId
    });

    return {
      accepted: false as const,
      reason: "duplicate_or_rate_limited"
    };
  }

  responseMarkers.set(markerKey(roomId, actorUid), {
    alertId: room.activeAlert.alertId,
    timestampMs
  });

  try {
    await ensureFirebaseSessionReady("submit_response");
    await getRoomRepository().submitResponse(roomId, actorUid, responseType, timestampMs);
  } catch (error) {
    throw wrapRoomError(error, "Submit response");
  }

  logger.debug("Response submitted", {
    roomId,
    actorUid,
    alertId: room.activeAlert.alertId,
    responseType
  });

  return {
    accepted: true as const
  };
}

export function __resetResponseMarkersForTests() {
  responseMarkers.clear();
}
