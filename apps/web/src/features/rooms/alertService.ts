import type { AlertType } from "@guardian/protocol";
import { logger } from "../../lib/logger";
import { wrapRoomError } from "./errorMessages";
import { getRoomRepository } from "./repository";
import { roomCodeSchema } from "./schemas";
import type { HardwareSource } from "./types";

export async function publishAlert(
  roomId: string,
  actorUid: string,
  alertType: AlertType,
  source: HardwareSource,
  issuedAtMs: number
) {
  try {
    const parsedRoomId = roomCodeSchema.parse(roomId);
    await getRoomRepository().publishAlert(parsedRoomId, actorUid, alertType, source, issuedAtMs);

    logger.debug("Alert published", {
      roomId: parsedRoomId,
      actorUid,
      alertType,
      source,
      issuedAtMs
    });
  } catch (error) {
    throw wrapRoomError(error, "Publish alert");
  }
}
