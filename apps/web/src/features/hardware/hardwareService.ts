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

const mockConfigSchema = z
  .object({
    minIntervalMs: z.number().int().min(1_000).max(5_000).default(2_000),
    maxIntervalMs: z.number().int().min(1_500).max(8_000).default(3_000)
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

function randomAlertType() {
  const index = Math.floor(Math.random() * ALERT_TYPES.length);
  return ALERT_TYPES[index] ?? "gas";
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
        simulatorIntervalMinMs: 2_000,
        simulatorIntervalMaxMs: 3_000
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

  const dispatchNext = () => {
    if (stopped) {
      return;
    }

    timerId = window.setTimeout(() => {
      const alertType = randomAlertType();
      callbacks.onAlert(alertType, Date.now());
      dispatchNext();
    }, nextTimeoutMs(parsed.minIntervalMs, parsed.maxIntervalMs));
  };

  callbacks.onStatus({
    connected: true,
    mode: "mock",
    message: "Mock generator running"
  });

  dispatchNext();

  return {
    stop() {
      stopped = true;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }

      callbacks.onStatus({
        connected: false,
        mode: "mock",
        message: "Mock generator stopped"
      });
    }
  };
}
