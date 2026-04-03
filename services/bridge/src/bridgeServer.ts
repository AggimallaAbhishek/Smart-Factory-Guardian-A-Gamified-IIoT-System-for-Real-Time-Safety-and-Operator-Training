import { createServer, type IncomingMessage, type Server as HttpServer } from "node:http";
import { randomBytes } from "node:crypto";
import {
  bridgeEventSchema,
  clientCommandSchema,
  parseFirmwareFrame,
  toAlertEvent,
  type BridgeEvent,
  type SourceType
} from "@guardian/protocol";
import { WebSocket, WebSocketServer } from "ws";
import { logger as defaultLogger, type Logger } from "./logger.js";
import { SlidingWindowRateLimiter } from "./rateLimiter.js";
import { SerialSource } from "./sources/serialSource.js";
import { SimulatorSource } from "./sources/simulatorSource.js";
import type { FrameSource } from "./sources/types.js";
import { toError } from "./utils.js";

interface SessionState {
  status: "idle" | "running" | "stopped";
  durationSec: number;
  remainingSec: number;
  startedAtMs: number | null;
  endedAtMs: number | null;
}

export interface BridgeServerOptions {
  host?: string;
  port?: number;
  token?: string;
  allowedOrigins?: string[];
  commandLimit?: number;
  commandWindowMs?: number;
  logger?: Logger;
}

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_COMMAND_LIMIT = 30;
const DEFAULT_COMMAND_WINDOW_MS = 10_000;
const DEFAULT_BAUD_RATE = 9600;

export class BridgeServer {
  private readonly host: string;
  private readonly port: number;
  private readonly token: string;
  private readonly allowedOrigins: Set<string>;
  private readonly commandLimit: number;
  private readonly commandWindowMs: number;
  private readonly logger: Logger;

  private httpServer: HttpServer | null = null;
  private wsServer: WebSocketServer | null = null;
  private readonly clients = new Set<WebSocket>();
  private readonly rateLimiters = new WeakMap<WebSocket, SlidingWindowRateLimiter>();

  private source: FrameSource | null = null;
  private sourceType: SourceType | null = null;

  private session: SessionState = {
    status: "idle",
    durationSec: 60,
    remainingSec: 60,
    startedAtMs: null,
    endedAtMs: null
  };

  private sessionTicker: NodeJS.Timeout | null = null;

  constructor(options: BridgeServerOptions = {}) {
    this.host = options.host ?? DEFAULT_HOST;
    this.port = options.port ?? DEFAULT_PORT;
    this.token = options.token ?? randomBytes(16).toString("hex");
    this.allowedOrigins = new Set(options.allowedOrigins ?? ["http://127.0.0.1:5173", "http://localhost:5173"]);
    this.commandLimit = options.commandLimit ?? DEFAULT_COMMAND_LIMIT;
    this.commandWindowMs = options.commandWindowMs ?? DEFAULT_COMMAND_WINDOW_MS;
    this.logger = options.logger ?? defaultLogger;
  }

  async start() {
    this.httpServer = createServer();
    this.wsServer = new WebSocketServer({ noServer: true });

    this.httpServer.on("upgrade", (request, socket, head) => {
      if (!this.wsServer) {
        socket.destroy();
        return;
      }

      const accepted = this.validateUpgradeRequest(request);
      if (!accepted.success) {
        socket.write(`HTTP/1.1 ${accepted.statusCode} ${accepted.message}\r\nConnection: close\r\n\r\n`);
        socket.destroy();
        this.logger.warn("Rejected websocket upgrade", {
          code: accepted.code,
          reason: accepted.message,
          ip: request.socket.remoteAddress,
          origin: request.headers.origin ?? "none"
        });
        return;
      }

      this.wsServer.handleUpgrade(request, socket, head, (ws) => {
        this.wsServer?.emit("connection", ws, request);
      });
    });

    this.wsServer.on("connection", (ws, request) => {
      this.onConnection(ws, request);
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer?.listen(this.port, this.host, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    this.logger.info("Bridge server started", {
      host: this.host,
      port: this.port,
      token: this.token,
      allowedOrigins: [...this.allowedOrigins]
    });
  }

  async stop() {
    if (this.sessionTicker) {
      clearInterval(this.sessionTicker);
      this.sessionTicker = null;
    }

    await this.disconnectSource();

    for (const client of this.clients) {
      client.close(1001, "Bridge shutting down");
    }
    this.clients.clear();

    await new Promise<void>((resolve) => {
      this.wsServer?.close(() => resolve());
      if (!this.wsServer) {
        resolve();
      }
    });

    await new Promise<void>((resolve) => {
      this.httpServer?.close(() => resolve());
      if (!this.httpServer) {
        resolve();
      }
    });

    this.logger.info("Bridge server stopped");
  }

  getToken() {
    return this.token;
  }

  getPort() {
    return this.port;
  }

  async autoConnectSerial(serialPath: string, baudRate: number = DEFAULT_BAUD_RATE) {
    await this.connectSource({
      source: "serial",
      serialPath,
      baudRate
    });
  }

  private onConnection(ws: WebSocket, request: IncomingMessage) {
    this.clients.add(ws);
    this.rateLimiters.set(ws, new SlidingWindowRateLimiter(this.commandLimit, this.commandWindowMs));

    this.logger.info("Client connected", {
      activeConnections: this.clients.size,
      ip: request.socket.remoteAddress,
      origin: request.headers.origin ?? "none"
    });

    this.sendStatus(ws, {
      status: "ready",
      source: this.sourceType ?? undefined,
      message: "Bridge connection established"
    });

    this.sendSessionState(ws);

    ws.on("message", (raw) => {
      this.handleClientMessage(ws, raw.toString()).catch((error) => {
        this.logger.error("Command handling failure", {
          message: toError(error).message
        });

        this.sendError(ws, "COMMAND_FAILED", "Command could not be completed.");
      });
    });

    ws.on("close", () => {
      this.clients.delete(ws);
      this.logger.info("Client disconnected", {
        activeConnections: this.clients.size
      });
    });
  }

  private validateUpgradeRequest(
    request: IncomingMessage
  ):
    | { success: true }
    | { success: false; statusCode: 401 | 403 | 404; message: string; code: string } {
    const url = request.url ? new URL(request.url, `http://${request.headers.host ?? `${this.host}:${this.port}`}`) : null;
    if (!url || url.pathname !== "/ws") {
      return {
        success: false,
        statusCode: 404,
        code: "INVALID_PATH",
        message: "Not Found"
      };
    }

    const requestToken = url.searchParams.get("token");
    if (requestToken !== this.token) {
      return {
        success: false,
        statusCode: 401,
        code: "INVALID_TOKEN",
        message: "Unauthorized"
      };
    }

    const origin = request.headers.origin;
    if (origin && !this.allowedOrigins.has(origin)) {
      return {
        success: false,
        statusCode: 403,
        code: "ORIGIN_NOT_ALLOWED",
        message: "Forbidden"
      };
    }

    return { success: true };
  }

  private async handleClientMessage(ws: WebSocket, payload: string) {
    const limiter = this.rateLimiters.get(ws);
    if (limiter && !limiter.consume()) {
      this.sendError(ws, "RATE_LIMITED", "Too many commands in a short period.");
      return;
    }

    let decoded: unknown;
    try {
      decoded = JSON.parse(payload);
    } catch {
      this.sendError(ws, "INVALID_JSON", "JSON payload is invalid.");
      return;
    }

    const parsed = clientCommandSchema.safeParse(decoded);
    if (!parsed.success) {
      this.sendError(ws, "INVALID_COMMAND", "Command payload failed validation.");
      return;
    }

    const command = parsed.data;
    if (command.token !== this.token) {
      this.sendError(ws, "AUTH_FAILED", "Invalid command token.");
      return;
    }

    this.logger.debug("Accepted command", {
      type: command.type
    });

    switch (command.type) {
      case "CONNECT_SOURCE": {
        try {
          await this.connectSource(command.payload);
        } catch (error) {
          this.logger.error("Failed to connect source", {
            message: toError(error).message,
            source: command.payload.source
          });
          this.sendError(ws, "SOURCE_CONNECT_FAILED", `Failed to connect ${command.payload.source} source.`);
        }
        return;
      }

      case "START_SESSION": {
        this.startSession(command.payload.durationSec);
        return;
      }

      case "STOP_SESSION": {
        this.stopSession();
        return;
      }

      case "TRIGGER_ALERT": {
        this.triggerAlert(command.payload.alertType);
        return;
      }

      case "START_GAME": {
        this.startGame();
        return;
      }

      case "STOP_GAME": {
        this.stopGame();
        return;
      }

      case "PING": {
        this.sendStatus(ws, {
          status: "ready",
          source: this.sourceType ?? undefined,
          message: "pong"
        });
        return;
      }
    }
  }

  private async connectSource(payload: {
    source: SourceType;
    serialPath?: string;
    baudRate?: number;
    simulatorIntervalMinMs?: number;
    simulatorIntervalMaxMs?: number;
  }) {
    await this.disconnectSource();

    if (payload.source === "serial") {
      if (!payload.serialPath) {
        this.broadcastError("INVALID_SERIAL_PATH", "Serial source requires a serialPath.");
        return;
      }

      const serialSource = new SerialSource({
        path: payload.serialPath,
        baudRate: payload.baudRate ?? DEFAULT_BAUD_RATE,
        logger: this.logger,
        onFrame: (line) => this.handleFrame(line, "serial"),
        onError: (error) => this.handleSourceError(error)
      });

      await serialSource.start();
      this.source = serialSource;
      this.sourceType = "serial";
      this.broadcastStatus({
        status: "source_connected",
        source: "serial",
        message: `Serial source connected (${payload.serialPath}).`
      });
      return;
    }

    const simulatorSource = new SimulatorSource({
      intervalMinMs: payload.simulatorIntervalMinMs ?? 2000,
      intervalMaxMs: payload.simulatorIntervalMaxMs ?? 3000,
      logger: this.logger,
      onFrame: (line) => this.handleFrame(line, "simulator"),
      onError: (error) => this.handleSourceError(error)
    });

    await simulatorSource.start();
    this.source = simulatorSource;
    this.sourceType = "simulator";

    this.broadcastStatus({
      status: "source_connected",
      source: "simulator",
      message: "Simulator source connected."
    });
  }

  private async disconnectSource() {
    if (!this.source) {
      return;
    }

    const currentType = this.sourceType;
    await this.source.stop();
    this.source = null;
    this.sourceType = null;

    this.broadcastStatus({
      status: "source_disconnected",
      source: currentType ?? undefined,
      message: "Source disconnected."
    });
  }

  private handleSourceError(error: Error) {
    this.logger.error("Source runtime error", {
      message: error.message,
      source: this.sourceType
    });

    this.broadcastError("SOURCE_ERROR", "Source failed while reading events.");
  }

  private handleFrame(line: string, source: SourceType) {
    const parsedFrame = parseFirmwareFrame(line);
    if (!parsedFrame) {
      this.logger.warn("Rejected malformed frame", {
        source,
        line
      });
      return;
    }

    if (this.session.status !== "running") {
      this.logger.debug("Ignored frame because session is not running", {
        source,
        frameEventId: parsedFrame.eventId
      });
      return;
    }

    const receivedTsMs = Date.now();
    const event = toAlertEvent({
      eventId: parsedFrame.eventId,
      alertType: parsedFrame.alertType,
      deviceTsMs: parsedFrame.deviceTsMs,
      receivedTsMs,
      source
    });

    const dispatchStartedMs = Date.now();
    this.broadcast(event);

    this.logger.debug("Alert dispatched", {
      source,
      eventId: parsedFrame.eventId,
      alertType: parsedFrame.alertType,
      dispatchLatencyMs: Date.now() - dispatchStartedMs,
      deviceTimestampMs: parsedFrame.deviceTsMs,
      bridgeReceiveTimestampMs: receivedTsMs
    });
  }

  private startSession(durationSec: number) {
    if (!this.sourceType || !this.source) {
      this.broadcastError("SOURCE_NOT_CONNECTED", "Connect a source before starting the session.");
      return;
    }

    if (this.session.status === "running") {
      this.broadcastError("SESSION_ALREADY_RUNNING", "Session is already running.");
      return;
    }

    const startedAtMs = Date.now();
    this.session = {
      status: "running",
      durationSec,
      remainingSec: durationSec,
      startedAtMs,
      endedAtMs: null
    };

    if (this.sessionTicker) {
      clearInterval(this.sessionTicker);
    }

    this.sessionTicker = setInterval(() => {
      if (this.session.status !== "running" || this.session.startedAtMs === null) {
        return;
      }

      const elapsedSec = Math.floor((Date.now() - this.session.startedAtMs) / 1000);
      const remainingSec = Math.max(0, this.session.durationSec - elapsedSec);

      if (remainingSec !== this.session.remainingSec) {
        this.session.remainingSec = remainingSec;
        this.broadcastSessionState();
      }

      if (remainingSec === 0) {
        this.stopSession();
      }
    }, 250);

    this.broadcastStatus({
      status: "session_started",
      source: this.sourceType,
      message: `Session started for ${durationSec} seconds.`
    });
    this.broadcastSessionState();

    this.logger.info("Session started", {
      durationSec,
      source: this.sourceType
    });
  }

  private stopSession() {
    if (this.session.status !== "running") {
      return;
    }

    if (this.sessionTicker) {
      clearInterval(this.sessionTicker);
      this.sessionTicker = null;
    }

    this.session = {
      ...this.session,
      status: "stopped",
      remainingSec: 0,
      endedAtMs: Date.now()
    };

    this.broadcastStatus({
      status: "session_stopped",
      source: this.sourceType ?? undefined,
      message: "Session stopped."
    });
    this.broadcastSessionState();

    this.logger.info("Session stopped", {
      source: this.sourceType
    });
  }

  private triggerAlert(alertType: string) {
    if (!this.source) {
      this.logger.warn("Cannot trigger alert - no source connected");
      return;
    }

    // Send command to Arduino if it's a serial source
    if (this.source.type === "serial" && this.source.sendCommand) {
      const command = `ALERT:${alertType.toUpperCase()}`;
      const success = this.source.sendCommand(command);
      
      if (success) {
        this.logger.info("Alert command sent to Arduino", { alertType });
      } else {
        this.logger.error("Failed to send alert command to Arduino", { alertType });
      }
    } else {
      this.logger.warn("Source does not support commands, cannot trigger alert", { 
        sourceType: this.source.type,
        alertType 
      });
    }
  }

  private startGame() {
    if (!this.source) {
      this.logger.warn("Cannot start game - no source connected");
      return;
    }

    // Send START_GAME command to Arduino if it's a serial source
    if (this.source.type === "serial" && this.source.sendCommand) {
      const success = this.source.sendCommand("START_GAME");
      
      if (success) {
        this.logger.info("Game start command sent to Arduino");
      } else {
        this.logger.error("Failed to send game start command to Arduino");
      }
    } else {
      this.logger.info("Game started (mock mode - no hardware command needed)");
    }
  }

  private stopGame() {
    if (!this.source) {
      this.logger.warn("Cannot stop game - no source connected");
      return;
    }

    // Send STOP_GAME command to Arduino if it's a serial source
    if (this.source.type === "serial" && this.source.sendCommand) {
      const success = this.source.sendCommand("STOP_GAME");
      
      if (success) {
        this.logger.info("Game stop command sent to Arduino");
      } else {
        this.logger.error("Failed to send game stop command to Arduino");
      }
    } else {
      this.logger.info("Game stopped (mock mode - no hardware command needed)");
    }
  }

  private sendSessionState(ws: WebSocket) {
    this.send(ws, {
      type: "SESSION_STATE",
      payload: {
        ...this.session
      }
    });
  }

  private broadcastSessionState() {
    this.broadcast({
      type: "SESSION_STATE",
      payload: {
        ...this.session
      }
    });
  }

  private sendStatus(
    ws: WebSocket,
    payload: {
      status: "ready" | "source_connected" | "source_disconnected" | "session_started" | "session_stopped";
      message: string;
      source?: SourceType;
    }
  ) {
    this.send(ws, {
      type: "BRIDGE_STATUS",
      payload: {
        status: payload.status,
        source: payload.source,
        message: payload.message,
        activeConnections: this.clients.size,
        timestampMs: Date.now()
      }
    });
  }

  private broadcastStatus(payload: {
    status: "ready" | "source_connected" | "source_disconnected" | "session_started" | "session_stopped";
    message: string;
    source?: SourceType;
  }) {
    this.broadcast({
      type: "BRIDGE_STATUS",
      payload: {
        status: payload.status,
        source: payload.source,
        message: payload.message,
        activeConnections: this.clients.size,
        timestampMs: Date.now()
      }
    });
  }

  private sendError(ws: WebSocket, code: string, message: string) {
    this.send(ws, {
      type: "ERROR",
      payload: {
        code,
        message,
        timestampMs: Date.now()
      }
    });
  }

  private broadcastError(code: string, message: string) {
    this.broadcast({
      type: "ERROR",
      payload: {
        code,
        message,
        timestampMs: Date.now()
      }
    });
  }

  private send(ws: WebSocket, event: BridgeEvent) {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const validated = bridgeEventSchema.parse(event);
    ws.send(JSON.stringify(validated));
  }

  private broadcast(event: BridgeEvent) {
    const validated = bridgeEventSchema.parse(event);
    const serialized = JSON.stringify(validated);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  }
}
