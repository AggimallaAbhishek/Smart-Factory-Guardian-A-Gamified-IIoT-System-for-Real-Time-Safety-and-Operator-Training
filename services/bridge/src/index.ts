import { BridgeServer } from "./bridgeServer.js";
import { logger } from "./logger.js";

function parseOrigins(raw: string | undefined) {
  if (!raw) {
    return ["http://127.0.0.1:5173", "http://localhost:5173"];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

async function main() {
  const bridge = new BridgeServer({
    host: process.env.BRIDGE_HOST,
    port: parsePositiveInt(process.env.BRIDGE_PORT),
    token: process.env.BRIDGE_TOKEN,
    allowedOrigins: parseOrigins(process.env.BRIDGE_ALLOW_ORIGINS),
    commandLimit: parsePositiveInt(process.env.BRIDGE_COMMAND_LIMIT),
    commandWindowMs: parsePositiveInt(process.env.BRIDGE_COMMAND_WINDOW_MS),
    logger
  });

  await bridge.start();

  logger.info("Bridge boot complete", {
    websocketUrl: `ws://127.0.0.1:${bridge.getPort()}/ws?token=<launch-token>`,
    launchToken: bridge.getToken()
  });

  const shutdown = async () => {
    logger.info("Bridge shutdown signal received");
    await bridge.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  logger.error("Bridge failed to start", {
    message: errorMessage
  });
  process.exit(1);
});
