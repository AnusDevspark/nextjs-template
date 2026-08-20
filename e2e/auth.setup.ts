import path from "node:path";

import { expect, test as setup } from "@playwright/test";

/**
 * Signs in once for the whole suite and saves the session to disk.
 *
 * Every `*.api.spec.ts` test then starts already authenticated instead of
 * driving the login form in a `beforeEach`. Two reasons, and the second is not
 * optional:
 *
 * 1. Speed. Logging in is the slowest thing most of these tests do, and it is
 *    not what they are testing.
 *
 * 2. The API rate-limits `/auth/login` to 10 attempts per 15 minutes by default
 *    (AUTH_RATE_LIMIT_MAX). One login per test exhausts that within a single
 *    run, and the failures land on whichever tests happen to run last — which
 *    looks like a flaky app rather than a throttled one.
 *
 * `contract.api.spec.ts` deliberately still logs in per test: it is testing the
 * login contract itself, so a cached session would defeat the point.
 */

export const STORAGE_STATE = path.join(__dirname, ".auth", "user.json");

setup("authenticate", async ({ page }) => {
  setup.skip(process.env.E2E_API_READY !== "true", "needs a seeded backend");

  await page.goto("/login");

  await page.getByLabel("Email").fill(process.env.E2E_EMAIL ?? "admin@example.com");
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "ChangeMe123!");
  await page.getByRole("button", { name: /sign in/i }).click();

  // Landing on the dashboard is the signal that the cookies were set; saving
  // before this resolves would persist a half-finished session.
  await expect(page).toHaveURL("/");

  await page.context().storageState({ path: STORAGE_STATE });
});
