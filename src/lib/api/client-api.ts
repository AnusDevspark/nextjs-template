"use client";

import { clientApiBaseUrl, env } from "@/config/env";

import { createApiClient, type ApiClient } from "./api-client";

/**
 * Browser-side API client, with a single-flight refresh.
 *
 * Token handling depends on `NEXT_PUBLIC_API_MODE`:
 *
 * - `proxy`  — no token ever reaches JavaScript. Requests go to `/api/bff/*`
 *   (same origin, cookies sent automatically) and the Route Handler attaches
 *   the token server-side.
 * - `direct` — requests go straight to the Node API, which needs an
 *   `Authorization` header. The access token is held in a module-level
 *   variable, seeded from `/api/auth/session`. It is short-lived and never
 *   written to `localStorage`; the refresh token stays in an HttpOnly cookie
 *   that JavaScript cannot read.
 */

const usesBearerToken = env.NEXT_PUBLIC_API_MODE === "direct";

let accessToken: string | null = null;

/** Resolves while a refresh is in flight; `null` otherwise. */
let refreshPromise: Promise<boolean> | null = null;

let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getStoredAccessToken(): string | null {
  return accessToken;
}

/**
 * Registered once by `AuthProvider`. Called after a refresh definitively fails,
 * so the app can clear cached data and send the user to `/login`.
 */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

/**
 * Exchanges the HttpOnly refresh cookie for a new access token.
 *
 * Every concurrent caller awaits the *same* promise, so ten parallel 401s
 * produce exactly one refresh request. The promise is cleared in `finally`, so
 * a later 401 can start a fresh attempt.
 */
export function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (!response.ok) return false;

      if (usesBearerToken) {
        const data = (await response.json()) as { accessToken?: string };
        if (!data.accessToken) return false;
        accessToken = data.accessToken;
      }

      return true;
    } catch {
      // Offline or the BFF is down. Treat as "could not refresh" rather than
      // logging the user out — a transient network blip should not sign them
      // out of a form they are halfway through.
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const clientApi: ApiClient = createApiClient({
  baseUrl: clientApiBaseUrl,
  getHeaders: (): Record<string, string> =>
    usesBearerToken && accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  // Cross-origin in `direct` mode, same-origin in `proxy` mode. `include`
  // covers both; the API must send Access-Control-Allow-Credentials in direct
  // mode for this to work.
  credentials: "include",
  onUnauthorized: async () => {
    const refreshed = await refreshSession();

    if (!refreshed) {
      accessToken = null;
      onSessionExpired?.();
    }

    return refreshed;
  },
});

/**
 * Client used for the auth endpoints themselves. It must never trigger the
 * refresh-and-retry path, or a failed login would loop.
 */
export const authApi: ApiClient = createApiClient({
  baseUrl: "",
  credentials: "same-origin",
});
