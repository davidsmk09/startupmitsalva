import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-Smoke-Tests im Mock-Modus (keine externen Keys).
 * Startet Web-App (Port 3100) und Worker gegen eine eigene SQLite-DB.
 */
const PORT = 3100;
const env = {
  DATABASE_URL: "file:./e2e.db",
  NEXTAUTH_URL: `http://localhost:${PORT}`,
  APP_URL: `http://localhost:${PORT}`,
  NEXTAUTH_SECRET: "e2e-secret-nur-fuer-tests-0123456789",
  CRON_SECRET: "e2e-cron-secret",
  JOB_MODE: "worker",
  MOCK_LATENCY_MS: "0",
  OPENAI_API_KEY: "",
  PERPLEXITY_API_KEY: "",
  GEMINI_API_KEY: "",
  ANTHROPIC_API_KEY: "",
  RESEND_API_KEY: "",
  STRIPE_SECRET_KEY: "",
  FIRECRAWL_API_KEY: "",
  WORKER_POLL_MS: "500",
  WORKER_HEALTH_PORT: "3101",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.E2E_USE_BUILD ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
      url: `http://localhost:${PORT}/api/health`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env,
    },
    {
      command: "npx tsx worker/index.ts",
      url: "http://localhost:3101/",
      timeout: 60_000,
      reuseExistingServer: !process.env.CI,
      env,
    },
  ],
});
