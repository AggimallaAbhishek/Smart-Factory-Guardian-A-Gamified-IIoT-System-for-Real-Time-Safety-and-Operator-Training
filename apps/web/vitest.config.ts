import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@guardian/domain": fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url)),
      "@guardian/protocol": fileURLToPath(new URL("../../packages/protocol/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["dist/**"],
    environment: "jsdom"
  }
});
