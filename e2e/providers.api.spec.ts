import { expect, test } from "@playwright/test";

/**
 * End-to-end coverage of the full CRUD loop against a real backend.
 *
 * Skipped unless `E2E_API_READY=true`, so the suite stays green on a machine
 * with no API running. Point it at a seeded test database and set:
 *
 *   E2E_API_READY=true E2E_EMAIL=admin@example.com E2E_PASSWORD=… npm run test:e2e
 *
 * These deliberately exercise the *framework* through a real module: if
 * pagination, filtering and delete work for Provider, they work for every
 * resource, because the code path is the same one.
 */
const apiReady = process.env.E2E_API_READY === "true";

test.describe("provider CRUD", () => {
  test.skip(!apiReady, "Set E2E_API_READY=true and run a seeded backend.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(process.env.E2E_EMAIL ?? "admin@example.com");
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL("/");
  });

  test("lists providers and paginates through the URL", async ({ page }) => {
    await page.goto("/providers");

    await expect(page.getByRole("heading", { name: "Providers" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: /next page/i }).click();
    await expect(page).toHaveURL(/page=2/);

    // The URL is the source of truth, so a reload restores the same view.
    await page.reload();
    await expect(page).toHaveURL(/page=2/);
  });

  test("filters and search survive a reload", async ({ page }) => {
    await page.goto("/providers");

    await page.getByRole("searchbox").fill("a");
    await expect(page).toHaveURL(/search=a/);

    await page.reload();
    await expect(page.getByRole("searchbox")).toHaveValue("a");
  });

  test("creates a provider and lands on its detail page", async ({ page }) => {
    const npi = String(Date.now()).slice(-10);

    await page.goto("/providers/create");

    await page.getByLabel("First name").fill("Playwright");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Email").fill(`pw-${npi}@example.com`);
    await page.getByLabel("NPI").fill(npi);

    await page.getByRole("button", { name: /create provider/i }).click();

    await expect(page.getByText(/created/i)).toBeVisible();
    await expect(page).toHaveURL(/\/providers\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Playwright Tester" })).toBeVisible();
  });

  test("requires confirmation before deleting", async ({ page }) => {
    await page.goto("/providers");

    await page
      .getByRole("button", { name: /^actions for/i })
      .first()
      .click();
    await page.getByRole("menuitem", { name: /^delete$/i }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/cannot be undone/i)).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});
