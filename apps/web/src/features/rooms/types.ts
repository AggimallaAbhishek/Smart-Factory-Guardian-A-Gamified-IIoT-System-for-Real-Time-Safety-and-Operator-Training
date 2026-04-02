import type { AlertType } from "@guardian/protocol";

export type RoomStatus = "lobby" | "running" | "ended";
export type HardwareSource = "bridge" | "mock";

export interface ActiveAlert {
  alertId: string;
  type: AlertType;
  issuedAtMs: number;
  source: HardwareSource;
  turnNumber: number;
  turnOwnerUid: string;
}

export interface RoomDoc {
  hostUid: string;
  status: RoomStatus;
  turnDurationSec: number;
  activePlayerUid: string | null;
  turnStartedAtMs: number | null;
  turnEndsAtMs: number | null;
  turnNumber: number;
  activeAlert: ActiveAlert | null;
  lastHostHeartbeatMs: number;
  createdAtMs: number;
  endedAtMs: number | null;
  playerQueue: string[];
}

export interface RoomPlayerDoc {
  uid: string;
  displayName: string;
  joinedAtMs: number;
  queueOrder: number;
  isConnected: boolean;
  totalScore: number;
  correctCount: number;
  wrongCount: number;
  missCount: number;
  responseCount: number;
  responseTimeTotalMs: number;
  avgResponseMs: number;
  accuracy: number;
  turnsPlayed: number;
}

export type RoomEventType =
  | "alert"
  | "response"
  | "turn_started"
  | "turn_advanced"
  | "turn_skipped_disconnected"
  | "room_started"
  | "room_ended"
  | "host_transferred";

export interface RoomEventDoc {
  eventId: string;
  type: RoomEventType;
  roomId: string;
  actorUid: string;
  timestampMs: number;
  payload: Record<string, unknown>;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  totalScore: number;
  avgResponseMs: number;
  accuracy: number;
  joinedAtMs: number;
  rank: number;
}

export interface TurnState {
  roomId: string;
  turnNumber: number;
  activePlayerUid: string | null;
  turnStartedAtMs: number | null;
  turnEndsAtMs: number | null;
}

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
}

export interface RoomSnapshot {
  roomId: string;
  room: RoomDoc;
  players: RoomPlayerDoc[];
}

export interface HardwareBridgeConfig {
  token: string;
  port: number;
}
