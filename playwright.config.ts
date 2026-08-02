import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/**
 * End-to-end configuration.
 *
 * The specs in `e2e/` are split into two groups:
 *
 *   - `*.smoke.spec.ts` runs against the app alone and covers routing, the auth
 *     redirect and rendering. These run in CI with no backend.
 *   - `*.api.spec.ts` needs a live Node API and is skipped unless
 *     `E2E_API_READY=true` is set. Point it at a seeded test database.
 *
 * Keeping them separate means the suite stays green on a machine that has no
 * backend, instead of being disabled wholesale.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // Reuses a running dev server locally; starts one in CI.
  webServer: {
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
