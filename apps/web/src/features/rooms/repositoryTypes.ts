import type { AlertType } from "@guardian/protocol";
import type { AuthUser, HardwareSource, RoomDoc, RoomPlayerDoc } from "./types";

export interface RoomRepository {
  subscribeRoom: (roomId: string, callback: (room: RoomDoc | null) => void) => () => void;
  subscribePlayers: (roomId: string, callback: (players: RoomPlayerDoc[]) => void) => () => void;
  createRoom: (user: AuthUser) => Promise<string>;
  joinRoom: (roomId: string, user: AuthUser) => Promise<void>;
  setPlayerConnection: (roomId: string, uid: string, connected: boolean) => Promise<void>;
  startRoom: (roomId: string, actorUid: string) => Promise<void>;
  endRoom: (roomId: string, actorUid: string) => Promise<void>;
  advanceTurn: (roomId: string, actorUid: string, reason: "force" | "timeout" | "disconnect") => Promise<void>;
  publishAlert: (
    roomId: string,
    actorUid: string,
    alertType: AlertType,
    source: HardwareSource,
    timestampMs: number
  ) => Promise<void>;
  submitResponse: (roomId: string, actorUid: string, responseType: AlertType, timestampMs: number) => Promise<void>;
  heartbeat: (roomId: string, actorUid: string, timestampMs: number) => Promise<void>;
  transferHostIfStale: (roomId: string, actorUid: string, timestampMs: number, staleThresholdMs: number) => Promise<void>;
}
