import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: "npm run dev:bridge:test",
      url: "ws://127.0.0.1:8787",
      timeout: 30_000,
      reuseExistingServer: true
    },
    {
      command: "npm run dev:web",
      port: 5173,
      timeout: 30_000,
      reuseExistingServer: true
    }
  ]
});
