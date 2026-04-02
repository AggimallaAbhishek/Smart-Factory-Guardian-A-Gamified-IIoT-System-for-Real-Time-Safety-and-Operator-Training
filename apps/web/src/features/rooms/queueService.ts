import { logger } from "../../lib/logger";
import { wrapRoomError } from "./errorMessages";
import { ensureFirebaseSessionReady } from "./firebaseSession";
import { getRoomRepository } from "./repository";
import { roomCodeSchema } from "./schemas";

export async function advanceTurn(roomId: string, actorUid: string, reason: "force" | "timeout" | "disconnect") {
  try {
    await ensureFirebaseSessionReady("advance_turn");
    const parsedRoomId = roomCodeSchema.parse(roomId);
    await getRoomRepository().advanceTurn(parsedRoomId, actorUid, reason);

    logger.debug("Turn advanced via queue service", {
      roomId: parsedRoomId,
      actorUid,
      reason
    });
  } catch (error) {
    throw wrapRoomError(error, "Advance turn");
  }
}

export async function transferHostIfStale(
  roomId: string,
  actorUid: string,
  timestampMs: number,
  staleThresholdMs: number
) {
  try {
    await ensureFirebaseSessionReady("transfer_host_if_stale");
    const parsedRoomId = roomCodeSchema.parse(roomId);
    await getRoomRepository().transferHostIfStale(parsedRoomId, actorUid, timestampMs, staleThresholdMs);
  } catch (error) {
    throw wrapRoomError(error, "Transfer host");
  }
}

export async function heartbeat(roomId: string, actorUid: string, timestampMs: number) {
  try {
    await ensureFirebaseSessionReady("host_heartbeat");
    const parsedRoomId = roomCodeSchema.parse(roomId);
    await getRoomRepository().heartbeat(parsedRoomId, actorUid, timestampMs);
  } catch (error) {
    throw wrapRoomError(error, "Host heartbeat");
  }
}
