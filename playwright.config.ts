import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // PW_EXECUTABLE_PATH permite usar un Chromium ya instalado (p. ej. en entornos remotos).
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH || undefined },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
  projects: [
    { name: "movil", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
  ],
});
