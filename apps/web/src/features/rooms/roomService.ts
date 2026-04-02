import { logger } from "../../lib/logger";
import { wrapRoomError } from "./errorMessages";
import { ensureFirebaseSessionReady } from "./firebaseSession";
import { getRoomRepository } from "./repository";
import { roomCodeSchema } from "./schemas";
import type { AuthUser } from "./types";

function normalizeRoomCode(roomCode: string) {
  return roomCodeSchema.parse(roomCode);
}

export async function createRoom(user: AuthUser) {
  try {
    await ensureFirebaseSessionReady("create_room");
    const repository = getRoomRepository();
    const roomId = await repository.createRoom(user);
    logger.info("Room created", {
      roomId,
      uid: user.uid
    });
    return roomId;
  } catch (error) {
    throw wrapRoomError(error, "Create room");
  }
}

export async function joinRoom(roomCode: string, user: AuthUser) {
  try {
    await ensureFirebaseSessionReady("join_room");
    const roomId = normalizeRoomCode(roomCode);
    await getRoomRepository().joinRoom(roomId, user);
    logger.info("Player joined room", {
      roomId,
      uid: user.uid
    });
    return roomId;
  } catch (error) {
    throw wrapRoomError(error, "Join room");
  }
}

export async function startRoom(roomId: string, actorUid: string) {
  try {
    await ensureFirebaseSessionReady("start_room");
    await getRoomRepository().startRoom(normalizeRoomCode(roomId), actorUid);
  } catch (error) {
    throw wrapRoomError(error, "Start room");
  }
}

export async function endRoom(roomId: string, actorUid: string) {
  try {
    await ensureFirebaseSessionReady("end_room");
    await getRoomRepository().endRoom(normalizeRoomCode(roomId), actorUid);
  } catch (error) {
    throw wrapRoomError(error, "End room");
  }
}

export async function setPlayerConnection(roomId: string, uid: string, connected: boolean) {
  try {
    await ensureFirebaseSessionReady("set_player_connection");
    await getRoomRepository().setPlayerConnection(normalizeRoomCode(roomId), uid, connected);
  } catch (error) {
    throw wrapRoomError(error, "Update player connection");
  }
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
