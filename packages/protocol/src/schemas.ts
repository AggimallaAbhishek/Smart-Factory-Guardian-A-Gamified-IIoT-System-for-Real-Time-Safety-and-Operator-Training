import { z } from "zod";
import { ALERT_TYPES, SOURCE_TYPES } from "./types.js";

const alertTypeSchema = z.enum(ALERT_TYPES);
const sourceTypeSchema = z.enum(SOURCE_TYPES);

export const connectSourceCommandSchema = z.object({
  type: z.literal("CONNECT_SOURCE"),
  token: z.string().min(8),
  payload: z
    .object({
      source: sourceTypeSchema,
      serialPath: z.string().min(1).optional(),
      baudRate: z.number().int().positive().max(921600).optional(),
      simulatorIntervalMinMs: z.number().int().min(250).max(5000).optional(),
      simulatorIntervalMaxMs: z.number().int().min(250).max(8000).optional()
    })
    .strict()
});

export const startSessionCommandSchema = z.object({
  type: z.literal("START_SESSION"),
  token: z.string().min(8),
  payload: z
    .object({
      durationSec: z.number().int().min(10).max(900).default(60)
    })
    .strict()
});

export const stopSessionCommandSchema = z.object({
  type: z.literal("STOP_SESSION"),
  token: z.string().min(8),
  payload: z.object({}).strict().optional()
});

export const pingCommandSchema = z.object({
  type: z.literal("PING"),
  token: z.string().min(8),
  payload: z.object({}).strict().optional()
});

export const clientCommandSchema = z.discriminatedUnion("type", [
  connectSourceCommandSchema,
  startSessionCommandSchema,
  stopSessionCommandSchema,
  pingCommandSchema
]);

export const bridgeStatusEventSchema = z.object({
  type: z.literal("BRIDGE_STATUS"),
  payload: z
    .object({
      status: z.enum(["ready", "source_connected", "source_disconnected", "session_started", "session_stopped"]),
      source: sourceTypeSchema.optional(),
      message: z.string(),
      activeConnections: z.number().int().nonnegative(),
      timestampMs: z.number().int().nonnegative()
    })
    .strict()
});

export const alertEventSchema = z.object({
  type: z.literal("ALERT"),
  payload: z
    .object({
      eventId: z.string().min(1),
      alertType: alertTypeSchema,
      deviceTsMs: z.number().int().nonnegative(),
      receivedTsMs: z.number().int().nonnegative(),
      source: sourceTypeSchema
    })
    .strict()
});

export const sessionStateEventSchema = z.object({
  type: z.literal("SESSION_STATE"),
  payload: z
    .object({
      status: z.enum(["idle", "running", "stopped"]),
      durationSec: z.number().int().positive(),
      remainingSec: z.number().int().nonnegative(),
      startedAtMs: z.number().int().nonnegative().nullable(),
      endedAtMs: z.number().int().nonnegative().nullable()
    })
    .strict()
});

export const errorEventSchema = z.object({
  type: z.literal("ERROR"),
  payload: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
      timestampMs: z.number().int().nonnegative()
    })
    .strict()
});

export const bridgeEventSchema = z.discriminatedUnion("type", [
  bridgeStatusEventSchema,
  alertEventSchema,
  sessionStateEventSchema,
  errorEventSchema
]);

export const firmwareFrameSchema = z.object({
  eventId: z.string().min(1),
  alertType: alertTypeSchema,
  deviceTsMs: z.number().int().nonnegative()
});

export type ClientCommand = z.infer<typeof clientCommandSchema>;
export type BridgeEvent = z.infer<typeof bridgeEventSchema>;
export type AlertEventPayload = z.infer<typeof alertEventSchema>["payload"];
export type FirmwareFrame = z.infer<typeof firmwareFrameSchema>;
