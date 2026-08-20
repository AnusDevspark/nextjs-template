import { expect, test } from "@playwright/test";

/**
 * Smoke tests that need no backend.
 *
 * They verify the parts of the app that are entirely the frontend's
 * responsibility: request-time redirects, the login screen, and client-side
 * validation. Anything requiring real data lives in `users.api.spec.ts`.
 */
test.describe("authentication routing", () => {
  // These are all about what an anonymous visitor sees, so they must discard
  // the shared signed-in session the other API specs run with.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects an anonymous visitor to the login page", async ({ page }) => {
    await page.goto("/users");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("preserves the requested path so login can return there", async ({ page }) => {
    await page.goto("/users?status=SUSPENDED");

    // `proxy.ts` puts the destination in `next`.
    await expect(page).toHaveURL(/next=/);
    expect(decodeURIComponent(page.url())).toContain("/users?status=SUSPENDED");
  });

  test("shows client-side validation before any request is made", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("x");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
  });

  test("associates each field error with its input for assistive technology", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /sign in/i }).click();

    const email = page.getByLabel("Email");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAttribute("aria-describedby", /.+/);
  });

  test("renders the not-found page for an unknown route", async ({ page }) => {
    // Under a public prefix on purpose. `proxy.ts` redirects an anonymous
    // visitor away from *any* non-public path before rendering can happen, so
    // an unauthenticated request to a random URL lands on /login, not here —
    // the 404 page is only reachable where the proxy stands aside.
    await page.goto("/login/this-route-does-not-exist");

    await expect(page.getByText(/page not found/i)).toBeVisible();
  });
});
