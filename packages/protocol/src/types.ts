export const ALERT_TYPES = ["gas", "temperature", "maintenance"] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const SOURCE_TYPES = ["serial", "simulator"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface AlertEvent {
  eventId: string;
  alertType: AlertType;
  deviceTsMs: number;
  receivedTsMs: number;
  source: SourceType;
}

export type SessionStatus = "idle" | "running" | "stopped";

export interface SessionEvent {
  eventId: string;
  alertType: AlertType;
  responseTimeMs?: number;
  outcome: "correct" | "wrong" | "miss";
}

export interface PlayerSession {
  id: string;
  name: string;
  durationSec: number;
  startedAtMs: number;
  endedAtMs: number;
  score: number;
  accuracy: number;
  avgResponseMs: number;
  events: SessionEvent[];
}
