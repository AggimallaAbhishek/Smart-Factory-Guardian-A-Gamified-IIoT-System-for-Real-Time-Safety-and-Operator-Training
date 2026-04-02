import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "cd apps/web && VITE_BACKEND_MODE=demo VITE_E2E_AUTH_MOCK=true npx vite --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    timeout: 45_000,
    reuseExistingServer: false
  }
});
