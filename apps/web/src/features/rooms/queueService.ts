import { logger } from "../../lib/logger";
import { getRoomRepository } from "./repository";
import { roomCodeSchema } from "./schemas";

export async function advanceTurn(roomId: string, actorUid: string, reason: "force" | "timeout" | "disconnect") {
  const parsedRoomId = roomCodeSchema.parse(roomId);
  await getRoomRepository().advanceTurn(parsedRoomId, actorUid, reason);

  logger.debug("Turn advanced via queue service", {
    roomId: parsedRoomId,
    actorUid,
    reason
  });
}

export async function transferHostIfStale(
  roomId: string,
  actorUid: string,
  timestampMs: number,
  staleThresholdMs: number
) {
  const parsedRoomId = roomCodeSchema.parse(roomId);
  await getRoomRepository().transferHostIfStale(parsedRoomId, actorUid, timestampMs, staleThresholdMs);
}

export async function heartbeat(roomId: string, actorUid: string, timestampMs: number) {
  const parsedRoomId = roomCodeSchema.parse(roomId);
  await getRoomRepository().heartbeat(parsedRoomId, actorUid, timestampMs);
}
