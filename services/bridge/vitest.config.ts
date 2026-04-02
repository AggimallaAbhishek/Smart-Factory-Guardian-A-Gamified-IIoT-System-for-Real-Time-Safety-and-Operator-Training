import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**"]
  },
  resolve: {
    alias: {
      "@guardian/protocol": fileURLToPath(new URL("../../packages/protocol/src/index.ts", import.meta.url))
    }
  }
});
