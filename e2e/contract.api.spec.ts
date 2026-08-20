import { expect, test } from "@playwright/test";

/**
 * Contract tests against a live backend.
 *
 * `src/lib/api/contract.test.ts` pins the same shapes against fixtures, which
 * catches a frontend that stops understanding the contract. This file catches
 * the other direction: a backend that stops honouring it. Both are needed —
 * fixtures cannot notice that the real API changed.
 *
 * Requires a seeded API. Run with:
 *   E2E_API_READY=true npx playwright test contract
 *
 * The credentials come from the backend's own seed defaults; override them with
 * E2E_EMAIL / E2E_PASSWORD if you seeded something else.
 *
 * Start the API with its auth rate limit raised, the way the backend's own
 * integration suite does (see tests/setup/integration.setup.ts there):
 *
 *   AUTH_RATE_LIMIT_MAX=100000 npm run dev
 *
 * The default is ten credential attempts per fifteen minutes — a good
 * production value and far too low for a suite that logs in repeatedly. Without
 * it a second run inside the window fails on 429s that look like broken auth.
 */

const API_URL = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
const EMAIL = process.env.E2E_EMAIL ?? "admin@example.com";
const PASSWORD = process.env.E2E_PASSWORD ?? "ChangeMe123!";

test.describe("API contract", () => {
  test.skip(process.env.E2E_API_READY !== "true", "needs a seeded backend");

  // One project is enough: this exercises HTTP, not rendering, so running it
  // again under a mobile viewport would prove nothing new.
  test.skip(({ browserName }) => browserName !== "chromium", "API-only");

  async function login(request: import("@playwright/test").APIRequestContext) {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(response.status(), "seeded admin must be able to log in").toBe(200);
    return response.json();
  }

  /**
   * One access token, shared by the tests that merely need to be authenticated.
   *
   * Tests that are *about* the login, refresh or logout contract still call
   * `login()` themselves — a cached token would defeat what they are checking.
   * Everything else reuses this, which keeps a full run well inside the API's
   * credential rate limit.
   */
  let sharedToken = "";

  test.beforeAll(async ({ playwright }) => {
    if (process.env.E2E_API_READY !== "true") return;

    const request = await playwright.request.newContext();
    sharedToken = (await login(request)).data.tokens.accessToken;
    await request.dispose();
  });

  const auth = () => ({ Authorization: `Bearer ${sharedToken}` });

  test("login returns the documented envelope", async ({ request }) => {
    const body = await login(request);

    expect(body.success).toBe(true);
    // Tokens live under data.tokens, NOT at the top level.
    expect(body).not.toHaveProperty("accessToken");
    expect(body.data.tokens.accessToken).toEqual(expect.any(String));
    expect(body.data.tokens.refreshToken).toEqual(expect.any(String));
    expect(body.data.tokens.tokenType).toBe("Bearer");
    // Seconds, not milliseconds.
    expect(body.data.tokens.expiresIn).toBeLessThanOrEqual(3600);
  });

  test("the session user carries a non-empty permissions array", async ({ request }) => {
    const me = await request.get(`${API_URL}/auth/me`, { headers: auth() });

    expect(me.status()).toBe(200);
    const payload = await me.json();

    // Without this every frontend permission gate fails closed and every
    // dashboard page redirects to /forbidden.
    expect(Array.isArray(payload.data.permissions)).toBe(true);
    expect(payload.data.permissions.length).toBeGreaterThan(0);
    expect(payload.data.permissions).toContain("USER_VIEW");

    // A single role string, not a roles array.
    expect(payload.data.role).toEqual(expect.any(String));
    expect(payload.data).not.toHaveProperty("roles");
    // And never the hash.
    expect(payload.data).not.toHaveProperty("passwordHash");
  });

  test("a list response carries all six meta keys and is one-indexed", async ({ request }) => {
    const response = await request.get(`${API_URL}/users?page=1&pageSize=2`, {
      headers: auth(),
    });

    expect(response.status()).toBe(200);
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(Object.keys(payload.meta).sort()).toEqual([
      "hasNextPage",
      "hasPreviousPage",
      "page",
      "pageSize",
      "total",
      "totalPages",
    ]);
    expect(payload.meta.page).toBe(1);
    expect(payload.meta.hasPreviousPage).toBe(false);
  });

  test("a missing token is 401 with an AUTH_ code, not 403", async ({ request }) => {
    const response = await request.get(`${API_URL}/users`);

    // Only a 401 triggers the client's refresh-and-retry. A 403 here would mean
    // an expired token silently logs the user out instead of refreshing.
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toMatch(/^AUTH_/);
    expect(body.message).toEqual(expect.any(String));
    expect(body.requestId).toEqual(expect.any(String));
  });

  test("validation failures are 400 with field-keyed errors", async ({ request }) => {
    const response = await request.get(`${API_URL}/users?pageSize=101`, { headers: auth() });

    // 400, never 422.
    expect(response.status()).toBe(400);

    const payload = await response.json();
    expect(payload.code).toBe("VALIDATION_FAILED");
    expect(payload.errors[0]).toMatchObject({
      field: "pageSize",
      message: expect.any(String),
    });
  });

  test("an unlisted sortBy is rejected rather than silently ignored", async ({ request }) => {
    const response = await request.get(`${API_URL}/users?sortBy=passwordHash`, {
      headers: auth(),
    });

    expect(response.status()).toBe(400);
  });

  test("every response echoes x-request-id", async ({ request }) => {
    const response = await request.get(`${API_URL}/users`);
    expect(response.headers()["x-request-id"]).toEqual(expect.any(String));
  });

  test("refresh rotates, and replaying the old token kills the family", async ({ request }) => {
    const body = await login(request);
    const original = body.data.tokens.refreshToken;

    const rotated = await request.post(`${API_URL}/auth/refresh`, {
      data: { refreshToken: original },
    });
    expect(rotated.status()).toBe(200);

    const next = (await rotated.json()).data.tokens.refreshToken;
    expect(next).not.toBe(original);

    // Replaying the consumed token is treated as theft.
    const replay = await request.post(`${API_URL}/auth/refresh`, {
      data: { refreshToken: original },
    });
    expect(replay.status()).toBe(401);
    expect((await replay.json()).code).toBe("AUTH_SESSION_REVOKED");
  });

  test("logout revokes the refresh token server-side", async ({ request }) => {
    const body = await login(request);
    const refreshToken = body.data.tokens.refreshToken;

    // The API takes the token in the body and needs no access token, so signing
    // out still works after the access token has expired.
    const logout = await request.post(`${API_URL}/auth/logout`, { data: { refreshToken } });
    expect(logout.status()).toBe(204);

    const afterLogout = await request.post(`${API_URL}/auth/refresh`, { data: { refreshToken } });
    expect(afterLogout.status()).toBe(401);
  });
});

test.describe("Next BFF contract", () => {
  test.skip(process.env.E2E_API_READY !== "true", "needs a seeded backend");
  test.skip(({ browserName }) => browserName !== "chromium", "API-only");

  test("login through the BFF sets cookies and returns the user with permissions", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: EMAIL, password: PASSWORD },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.user.permissions.length).toBeGreaterThan(0);
    expect(body.user.role).toEqual(expect.any(String));

    const cookies = response.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie");
    const joined = cookies.map((c) => c.value).join(";");
    expect(joined).toContain("acme_at");
    expect(joined).toContain("acme_rt");
    // Both cookies must be inaccessible to JavaScript.
    expect(joined.toLowerCase()).toContain("httponly");
  });
});
