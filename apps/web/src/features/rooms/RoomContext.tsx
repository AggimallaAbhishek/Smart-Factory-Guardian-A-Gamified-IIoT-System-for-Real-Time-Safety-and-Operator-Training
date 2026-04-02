import { createContext, useContext } from "react";
import type { AlertType } from "@guardian/protocol";
import type { LeaderboardEntry, RoomDoc, RoomPlayerDoc } from "./types";

export interface RoomContextValue {
  roomId: string;
  room: RoomDoc | null;
  players: RoomPlayerDoc[];
  leaderboard: LeaderboardEntry[];
  myPlayer: RoomPlayerDoc | null;
  loading: boolean;
  error: string | null;
  isHost: boolean;
  isActivePlayer: boolean;
  startRoom: () => Promise<void>;
  endRoom: () => Promise<void>;
  forceNextTurn: () => Promise<void>;
  publishAlert: (alertType: AlertType, source: "bridge" | "mock", timestampMs: number) => Promise<void>;
  submitResponse: (responseType: AlertType, timestampMs: number) => Promise<{ accepted: boolean; reason?: string }>;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

export function useRoomContext() {
  const value = useContext(RoomContext);
  if (!value) {
    throw new Error("useRoomContext must be used inside RoomLayout.");
  }

  return value;
}
