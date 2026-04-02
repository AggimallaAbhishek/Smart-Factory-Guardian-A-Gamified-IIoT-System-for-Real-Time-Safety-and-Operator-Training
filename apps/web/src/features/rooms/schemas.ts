import { ALERT_TYPES } from "@guardian/protocol";
import { z } from "zod";

export const roomStatusSchema = z.enum(["lobby", "running", "ended"]);
export const hardwareSourceSchema = z.enum(["bridge", "mock"]);
export const roomEventTypeSchema = z.enum([
  "alert",
  "response",
  "turn_started",
  "turn_advanced",
  "turn_skipped_disconnected",
  "room_started",
  "room_ended",
  "host_transferred"
]);

export const activeAlertSchema = z
  .object({
    alertId: z.string().min(1),
    type: z.enum(ALERT_TYPES),
    issuedAtMs: z.number().int().nonnegative(),
    source: hardwareSourceSchema,
    turnNumber: z.number().int().nonnegative(),
    turnOwnerUid: z.string().min(1)
  })
  .strict();

export const roomDocSchema = z
  .object({
    hostUid: z.string().min(1),
    status: roomStatusSchema,
    turnDurationSec: z.number().int().min(30).max(600),
    activePlayerUid: z.string().min(1).nullable(),
    turnStartedAtMs: z.number().int().nonnegative().nullable(),
    turnEndsAtMs: z.number().int().nonnegative().nullable(),
    turnNumber: z.number().int().nonnegative(),
    activeAlert: activeAlertSchema.nullable(),
    lastHostHeartbeatMs: z.number().int().nonnegative(),
    createdAtMs: z.number().int().nonnegative(),
    endedAtMs: z.number().int().nonnegative().nullable(),
    playerQueue: z.array(z.string().min(1)).default([])
  })
  .strict();

export const roomPlayerDocSchema = z
  .object({
    uid: z.string().min(1),
    displayName: z.string().min(1).max(80),
    joinedAtMs: z.number().int().nonnegative(),
    queueOrder: z.number().int().nonnegative(),
    isConnected: z.boolean(),
    totalScore: z.number().int(),
    correctCount: z.number().int().nonnegative(),
    wrongCount: z.number().int().nonnegative(),
    missCount: z.number().int().nonnegative(),
    responseCount: z.number().int().nonnegative(),
    responseTimeTotalMs: z.number().nonnegative(),
    avgResponseMs: z.number().nonnegative(),
    accuracy: z.number().min(0).max(100),
    turnsPlayed: z.number().int().nonnegative()
  })
  .strict();

export const roomEventDocSchema = z
  .object({
    eventId: z.string().min(1),
    type: roomEventTypeSchema,
    roomId: z.string().min(1),
    actorUid: z.string().min(1),
    timestampMs: z.number().int().nonnegative(),
    payload: z.record(z.unknown())
  })
  .strict();

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4,8}$/, "Room code must be 4 to 8 alphanumeric characters.");

export const bridgeConfigSchema = z
  .object({
    token: z.string().min(8),
    port: z.number().int().min(1024).max(65535),
    source: z.enum(["serial", "simulator"]),
    serialPath: z.string().min(1).optional()
  })
  .strict();

export const responseRequestSchema = z
  .object({
    roomId: roomCodeSchema,
    actorUid: z.string().min(1),
    responseType: z.enum(ALERT_TYPES),
    timestampMs: z.number().int().nonnegative()
  })
  .strict();

export type RoomDocInput = z.infer<typeof roomDocSchema>;
export type RoomPlayerDocInput = z.infer<typeof roomPlayerDocSchema>;
