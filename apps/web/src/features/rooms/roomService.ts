import { logger } from "../../lib/logger";
import { getRoomRepository } from "./repository";
import { roomCodeSchema } from "./schemas";
import type { AuthUser } from "./types";

function normalizeRoomCode(roomCode: string) {
  return roomCodeSchema.parse(roomCode);
}

export async function createRoom(user: AuthUser) {
  const repository = getRoomRepository();
  const roomId = await repository.createRoom(user);
  logger.info("Room created", {
    roomId,
    uid: user.uid
  });
  return roomId;
}

export async function joinRoom(roomCode: string, user: AuthUser) {
  const roomId = normalizeRoomCode(roomCode);
  await getRoomRepository().joinRoom(roomId, user);
  logger.info("Player joined room", {
    roomId,
    uid: user.uid
  });
  return roomId;
}

export async function startRoom(roomId: string, actorUid: string) {
  await getRoomRepository().startRoom(normalizeRoomCode(roomId), actorUid);
}

export async function endRoom(roomId: string, actorUid: string) {
  await getRoomRepository().endRoom(normalizeRoomCode(roomId), actorUid);
}

export async function setPlayerConnection(roomId: string, uid: string, connected: boolean) {
  await getRoomRepository().setPlayerConnection(normalizeRoomCode(roomId), uid, connected);
}

export function subscribeRoom(roomId: string, callback: Parameters<ReturnType<typeof getRoomRepository>["subscribeRoom"]>[1]) {
  return getRoomRepository().subscribeRoom(normalizeRoomCode(roomId), callback);
}

export function subscribePlayers(
  roomId: string,
  callback: Parameters<ReturnType<typeof getRoomRepository>["subscribePlayers"]>[1]
) {
  return getRoomRepository().subscribePlayers(normalizeRoomCode(roomId), callback);
}
