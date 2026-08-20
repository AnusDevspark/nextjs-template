import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the full CRUD loop against a real backend.
 *
 * Skipped unless `E2E_API_READY=true`, so the suite stays green on a machine
 * with no API running. Point it at a seeded database and run:
 *
 *   E2E_API_READY=true E2E_EMAIL=admin@example.com E2E_PASSWORD=… npm run test:e2e
 *
 * These deliberately exercise the *framework* through a real module: if
 * pagination, filtering and delete work for User, they work for every resource,
 * because the code path is the same one.
 */
const apiReady = process.env.E2E_API_READY === "true";

/**
 * Fills a field and makes sure the value survived.
 *
 * The form is server-rendered, so its inputs are visible — and fillable —
 * before React has hydrated them. A value written in that window is on the DOM
 * node but not in React's state, and the first render after hydration wipes it.
 * The failure is timing-dependent: it shows up under parallel load and vanishes
 * when the test runs alone, which is the worst kind of flake to chase.
 *
 * `toPass` retries the fill itself, not just the assertion, so the value is
 * re-entered once hydration has landed.
 */
async function fillField(
  page: import("@playwright/test").Page,
  label: string,
  value: string,
): Promise<void> {
  const field = page.getByLabel(label);

  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }).toPass({ timeout: 10_000 });
}

test.describe("user CRUD", () => {
  test.skip(!apiReady, "Set E2E_API_READY=true and run a seeded backend.");

  // No login here: `auth.setup.ts` signs in once for the whole run and these
  // tests inherit that session through `storageState`. Logging in per test
  // would exhaust the API's auth rate limit part-way through the suite.

  test("lists users and paginates through the URL", async ({ page }) => {
    await page.goto("/users?pageSize=2");

    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    // The seed creates an admin plus five sample accounts.
    await expect(page.getByRole("row")).not.toHaveCount(0);

    await page.getByRole("button", { name: /next page/i }).click();
    await expect(page).toHaveURL(/page=2/);

    // The URL is the source of truth, so a reload restores the same view.
    await page.reload();
    await expect(page).toHaveURL(/page=2/);
  });

  test("search survives a reload", async ({ page }) => {
    await page.goto("/users");

    await page.getByRole("searchbox").fill("ada");
    await expect(page).toHaveURL(/search=ada/);

    await page.reload();
    await expect(page.getByRole("searchbox")).toHaveValue("ada");
  });

  test("filters by status without a full page load", async ({ page }) => {
    await page.goto("/users?status=SUSPENDED");

    await expect(page.getByRole("table")).toBeVisible();
    // Johanna Weiss is seeded SUSPENDED.
    await expect(page.getByRole("cell", { name: /suspended/i }).first()).toBeVisible();
  });

  test("creates a user and lands on its detail page", async ({ page }) => {
    const unique = String(Date.now()).slice(-10);

    await page.goto("/users/create");

    await fillField(page, "First name", "Playwright");
    await fillField(page, "Last name", "Tester");
    await fillField(page, "Email", `pw-${unique}@example.com`);
    await fillField(page, "Password", "PlaywrightPass123!");

    await page.getByRole("button", { name: /create user/i }).click();

    await expect(page.getByText(/created/i)).toBeVisible();
    await expect(page).toHaveURL(/\/users\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Playwright Tester" })).toBeVisible();
  });

  test("shows a duplicate email next to the field, not as a toast", async ({ page }) => {
    await page.goto("/users/create");

    await fillField(page, "First name", "Duplicate");
    await fillField(page, "Last name", "Attempt");
    // Already taken by the seed.
    await fillField(page, "Email", process.env.E2E_EMAIL ?? "admin@example.com");
    await fillField(page, "Password", "PlaywrightPass123!");

    await page.getByRole("button", { name: /create user/i }).click();

    // The 409 maps onto the email input; the form must not navigate away.
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/users\/create$/);
  });

  test("offers no password field when editing", async ({ page }) => {
    await page.goto("/users?pageSize=5");
    await page.getByRole("table").getByRole("link").first().click();

    await expect(page).toHaveURL(/\/users\/[^/]+$/);
    await page.getByRole("link", { name: /edit/i }).first().click();

    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
  });

  test("requires confirmation before deleting", async ({ page }) => {
    await page.goto("/users?pageSize=5");
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: /actions for/i }).first().click();
    await page.getByRole("menuitem", { name: /^delete$/i }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/permanently deleted/i)).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});
