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

async function main() {
  const bridge = new BridgeServer({
    host: process.env.BRIDGE_HOST,
    port: process.env.BRIDGE_PORT ? Number(process.env.BRIDGE_PORT) : undefined,
    token: process.env.BRIDGE_TOKEN,
    allowedOrigins: parseOrigins(process.env.BRIDGE_ALLOW_ORIGINS),
    commandLimit: process.env.BRIDGE_COMMAND_LIMIT ? Number(process.env.BRIDGE_COMMAND_LIMIT) : undefined,
    commandWindowMs: process.env.BRIDGE_COMMAND_WINDOW_MS
      ? Number(process.env.BRIDGE_COMMAND_WINDOW_MS)
      : undefined,
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

main().catch((error: Error) => {
  logger.error("Bridge failed to start", {
    message: error.message
  });
  process.exit(1);
});
