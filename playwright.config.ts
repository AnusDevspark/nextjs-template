import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

/** Where `auth.setup.ts` parks the signed-in session. */
const storageState = path.join(__dirname, "e2e", ".auth", "user.json");

/**
 * The setup project only runs — and only writes that file — when a backend is
 * available, so without one there is no state to load and nothing to depend on.
 * Referencing a missing storageState file is a hard error, not a skip.
 */
const apiReady = process.env.E2E_API_READY === "true";

/** Project-level: run the setup project first. `use`-level: load its output. */
const needsSetup = apiReady ? { dependencies: ["setup"] } : {};
const useSavedSession = apiReady ? { storageState } : {};

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
    // Signs in once and saves the session; the CRUD specs depend on it rather
    // than logging in per test. See e2e/auth.setup.ts for why that matters.
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    {
      name: "chromium",
      ...needsSetup,
      use: { ...devices["Desktop Chrome"], ...useSavedSession },
    },
    {
      name: "mobile",
      ...needsSetup,
      use: { ...devices["Pixel 7"], ...useSavedSession },
    },
  ],

  // Reuses a running dev server locally; starts one in CI.
  webServer: {
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
