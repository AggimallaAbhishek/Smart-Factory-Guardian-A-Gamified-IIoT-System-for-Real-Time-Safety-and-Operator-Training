import { afterEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { parseFirmwareFrame } from "@guardian/protocol";
import { BridgeServer } from "./bridgeServer.js";
import { SimulatorSource } from "./sources/simulatorSource.js";

const TEST_TOKEN = "test-token-1234";
let activeServer: BridgeServer | null = null;

afterEach(async () => {
  if (activeServer) {
    await activeServer.stop();
    activeServer = null;
  }
});

async function startBridge(overrides?: {
  commandLimit?: number;
  commandWindowMs?: number;
}) {
  const server = new BridgeServer({
    host: "127.0.0.1",
    port: 8790,
    token: TEST_TOKEN,
    allowedOrigins: ["http://127.0.0.1:5173"],
    commandLimit: overrides?.commandLimit,
    commandWindowMs: overrides?.commandWindowMs
  });
  await server.start();
  activeServer = server;
  return server;
}

function connectClient() {
  return new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:8790/ws?token=${TEST_TOKEN}`, {
      headers: {
        origin: "http://127.0.0.1:5173"
      }
    });

    ws.once("open", () => resolve(ws));
    ws.once("error", (error: Error) => reject(error));
  });
}

function waitForType<T extends Record<string, unknown>>(ws: WebSocket, type: string): Promise<T> {
  return new Promise((resolve) => {
    const listener = (raw: Buffer) => {
      const parsed = JSON.parse(raw.toString()) as { type: string };
      if (parsed.type !== type) {
        return;
      }

      ws.off("message", listener);
      resolve(parsed as unknown as T);
    };

    ws.on("message", listener);
  });
}

describe("bridge security and protocol", () => {
  it("rejects malformed command payload", async () => {
    await startBridge();
    const ws = await connectClient();

    ws.send(
      JSON.stringify({
        type: "START_SESSION",
        token: TEST_TOKEN,
        payload: {
          durationSec: "60"
        }
      })
    );

    const errorEvent = await waitForType<{ payload: { code: string } }>(ws, "ERROR");
    expect(errorEvent.payload.code).toBe("INVALID_COMMAND");

    ws.close();
  });

  it("enforces command rate limits", async () => {
    await startBridge({ commandLimit: 2, commandWindowMs: 1000 });
    const ws = await connectClient();

    const ping = () =>
      ws.send(
        JSON.stringify({
          type: "PING",
          token: TEST_TOKEN,
          payload: {}
        })
      );

    ping();
    ping();
    ping();

    const errorEvent = await waitForType<{ payload: { code: string } }>(ws, "ERROR");
    expect(errorEvent.payload.code).toBe("RATE_LIMITED");

    ws.close();
  });
});

describe("simulator parity", () => {
  it("emits firmware-compatible frames with deterministic sequence", async () => {
    const frames: string[] = [];
    const simulator = new SimulatorSource({
      intervalMinMs: 5,
      intervalMaxMs: 5,
      deterministicSequence: ["gas", "temperature", "maintenance"],
      now: (() => {
        let ts = 1000;
        return () => {
          ts += 5;
          return ts;
        };
      })(),
      random: () => 0,
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined
      },
      onFrame: (line) => {
        frames.push(line);
      },
      onError: (error) => {
        throw error;
      }
    });

    await simulator.start();
    await new Promise((resolve) => setTimeout(resolve, 25));
    await simulator.stop();

    expect(frames.length).toBeGreaterThan(1);

    const parsed = frames.map((frame) => parseFirmwareFrame(frame));
    parsed.forEach((frame) => {
      expect(frame).not.toBeNull();
    });
  });
});
