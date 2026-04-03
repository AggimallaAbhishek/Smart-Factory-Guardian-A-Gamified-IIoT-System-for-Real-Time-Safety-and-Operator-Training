export const TURN_DURATION_SEC = 60;
export const HOST_HEARTBEAT_INTERVAL_MS = 5_000;
export const HOST_STALE_THRESHOLD_MS = 60_000;
export const ROOM_STORAGE_KEY = "guardian.demo.rooms.v1";
export const MAX_PLAYERS = 10;

/**
 * Arduino reaction time limits:
 * - Easy (score < 30): 2500ms
 * - Medium (score 30-59): 1500ms
 * - Extreme (score >= 60): 500ms
 *
 * For demo, we use the easy mode timeout.
 */
export const ALERT_TIMEOUT_MS = 2_500;

/**
 * Turn transition timing - countdown between players
 * Random interval between 10-15 seconds
 */
export const TURN_TRANSITION_MIN_SEC = 10;
export const TURN_TRANSITION_MAX_SEC = 15;
