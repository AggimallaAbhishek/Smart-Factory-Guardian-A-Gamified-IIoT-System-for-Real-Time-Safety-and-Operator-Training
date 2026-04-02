import { firestoreDb, backendMode } from "../../firebase/config";
import { logger } from "../../lib/logger";
import { DemoRoomRepository } from "./demoRoomRepository";
import { FirebaseRoomRepository } from "./firebaseRoomRepository";
import type { RoomRepository } from "./repositoryTypes";

let repositorySingleton: RoomRepository | null = null;

export function getRoomRepository(): RoomRepository {
  if (repositorySingleton) {
    return repositorySingleton;
  }

  if (backendMode === "firebase" && firestoreDb) {
    logger.info("Room repository mode: firebase");
    repositorySingleton = new FirebaseRoomRepository(firestoreDb);
    return repositorySingleton;
  }

  logger.info("Room repository mode: demo");
  repositorySingleton = new DemoRoomRepository();
  return repositorySingleton;
}

export function __resetRepositoryForTests() {
  repositorySingleton = null;
}
