import {
  ALERT_TYPES,
  bridgeEventSchema,
  type AlertType,
  type ClientCommand,
  type SourceType
} from "@guardian/protocol";
import { z } from "zod";
import { logger } from "../../lib/logger";
import { bridgeConfigSchema } from "../rooms/schemas";

const START_SESSION_DURATION_SEC = 24 * 60 * 60;

/**
 * Arduino-matching timing config:
 * - Easy (score < 30): 2500ms reaction, 1200-1600ms gap
 * - Medium (score 30-59): 1500ms reaction, 900-1300ms gap
 * - Extreme (score >= 60): 500ms reaction, 600-900ms gap
 *
 * For demo mode, we use fixed intervals that feel responsive.
 */
const mockConfigSchema = z
  .object({
    minIntervalMs: z.number().int().min(500).max(5_000).default(1_200),
    maxIntervalMs: z.number().int().min(800).max(8_000).default(2_500),
    alertDurationMs: z.number().int().min(500).max(30_000).default(6_000)
  })
  .strict();

export interface BridgeConnectConfig {
  token: string;
  port: number;
  source: SourceType;
  serialPath?: string;
}

export interface MockConfig {
  minIntervalMs?: number;
  maxIntervalMs?: number;
  alertDurationMs?: number;
}

export interface HardwareStatus {
  connected: boolean;
  message: string;
  mode: "bridge" | "mock";
  lastError?: string;
}

export interface HardwareController {
  stop: () => void;
}

export interface HardwareCallbacks {
  onAlert: (alertType: AlertType, timestampMs: number) => void;
  onStatus: (status: HardwareStatus) => void;
}

/**
 * Arduino-matching weighted random selection:
 * - Gas: 40% (events 0-3 out of 10)
 * - Temperature: 40% (events 4-7 out of 10)
 * - Maintenance: 20% (events 8-9 out of 10)
 *
 * Also prevents consecutive same alerts (Arduino behavior).
 */
let lastAlertType: AlertType | null = null;

function weightedRandomAlertType(): AlertType {
  let alertType: AlertType;
  let attempts = 0;

  do {
    const roll = Math.floor(Math.random() * 10);

    if (roll < 4) {
      alertType = "gas";
    } else if (roll < 8) {
      alertType = "temperature";
    } else {
      alertType = "maintenance";
    }

    attempts++;
    // Prevent same alert twice in a row (Arduino behavior), but limit retries
  } while (alertType === lastAlertType && attempts < 5);

  lastAlertType = alertType;
  return alertType;
}

function nextTimeoutMs(minMs: number, maxMs: number) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

function sendBridgeCommand(ws: WebSocket, command: ClientCommand) {
  ws.send(JSON.stringify(command));
}

export function connectBridge(config: BridgeConnectConfig, callbacks: HardwareCallbacks): HardwareController {
  const parsed = bridgeConfigSchema.parse(config);
  const ws = new WebSocket(`ws://127.0.0.1:${parsed.port}/ws?token=${encodeURIComponent(parsed.token)}`);

  let closed = false;

  ws.addEventListener("open", () => {
    logger.info("Bridge websocket opened", {
      port: parsed.port,
      source: parsed.source
    });

    sendBridgeCommand(ws, {
      type: "CONNECT_SOURCE",
      token: parsed.token,
      payload: {
        source: parsed.source,
        serialPath: parsed.serialPath,
        simulatorIntervalMinMs: 1_200,
        simulatorIntervalMaxMs: 2_500
      }
    });

    sendBridgeCommand(ws, {
      type: "START_SESSION",
      token: parsed.token,
      payload: {
        durationSec: START_SESSION_DURATION_SEC
      }
    });

    callbacks.onStatus({
      connected: true,
      message: "Bridge connected",
      mode: "bridge"
    });
  });

  ws.addEventListener("message", (event) => {
    try {
      const decoded = JSON.parse(String(event.data));
      const parsedEvent = bridgeEventSchema.safeParse(decoded);

      if (!parsedEvent.success) {
        callbacks.onStatus({
          connected: true,
          mode: "bridge",
          message: "Ignoring malformed bridge event",
          lastError: "Malformed bridge payload"
        });
        return;
      }

      const bridgeEvent = parsedEvent.data;
      if (bridgeEvent.type === "ALERT") {
        callbacks.onAlert(bridgeEvent.payload.alertType, Date.now());
        return;
      }

      if (bridgeEvent.type === "ERROR") {
        callbacks.onStatus({
          connected: true,
          mode: "bridge",
          message: bridgeEvent.payload.message,
          lastError: bridgeEvent.payload.code
        });
        return;
      }

      if (bridgeEvent.type === "BRIDGE_STATUS") {
        callbacks.onStatus({
          connected: true,
          mode: "bridge",
          message: bridgeEvent.payload.message
        });
      }
    } catch (error) {
      callbacks.onStatus({
        connected: true,
        mode: "bridge",
        message: "Bridge event parse failure",
        lastError: String(error)
      });
    }
  });

  ws.addEventListener("close", () => {
    if (closed) {
      return;
    }

    callbacks.onStatus({
      connected: false,
      mode: "bridge",
      message: "Bridge disconnected"
    });
  });

  ws.addEventListener("error", () => {
    callbacks.onStatus({
      connected: false,
      mode: "bridge",
      message: "Bridge connection failed",
      lastError: "Unable to open websocket"
    });
  });

  return {
    stop() {
      if (closed) {
        return;
      }

      closed = true;

      if (ws.readyState === WebSocket.OPEN) {
        sendBridgeCommand(ws, {
          type: "STOP_SESSION",
          token: parsed.token,
          payload: {}
        });
      }

      ws.close();
      callbacks.onStatus({
        connected: false,
        mode: "bridge",
        message: "Bridge stopped"
      });
    }
  };
}

export function startMock(config: MockConfig, callbacks: HardwareCallbacks): HardwareController {
  const parsed = mockConfigSchema.parse(config);
  let timerId: number | null = null;
  let stopped = false;

  logger.info("Starting mock hardware source", {
    minIntervalMs: parsed.minIntervalMs,
    maxIntervalMs: parsed.maxIntervalMs
  });

  const dispatchNext = () => {
    if (stopped) {
      return;
    }

    timerId = window.setTimeout(() => {
      const alertType = weightedRandomAlertType();
      logger.debug("Mock hardware emitted alert", {
        alertType
      });
      callbacks.onAlert(alertType, Date.now());
      dispatchNext();
    }, nextTimeoutMs(parsed.minIntervalMs, parsed.maxIntervalMs));
  };

  callbacks.onStatus({
    connected: true,
    mode: "mock",
    message: "Mock generator running (Arduino-style weighted alerts)"
  });

  dispatchNext();

  return {
    stop() {
      stopped = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }

      logger.info("Mock hardware source stopped");

      callbacks.onStatus({
        connected: false,
        mode: "mock",
        message: "Mock generator stopped"
      });
    }
  };
}
