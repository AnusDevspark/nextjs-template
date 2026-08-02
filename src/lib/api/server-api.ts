import "server-only";

import { serverEnv } from "@/config/server-env";
import { getAccessToken } from "@/lib/auth/auth-cookies";

import { createApiClient, type ApiClient } from "./api-client";

/**
 * The API client for Server Components, Server Actions and Route Handlers.
 *
 * Reads the access token from the HttpOnly cookie on every request, so it is
 * always current within a request. It deliberately does **not** refresh on 401:
 * a Server Component cannot set cookies, so the refresh would be lost. Instead
 * `requireSession` redirects to `/login`, and the browser re-authenticates
 * through the BFF where cookies *can* be written.
 *
 * Requests are uncached by default — resource data is per-user and per-request,
 * and Next's default caching would leak one user's list to another.
 */
export const serverApi: ApiClient = createApiClient({
  baseUrl: serverEnv.API_URL,
  defaultTimeoutMs: serverEnv.API_TIMEOUT_MS,
  getHeaders: async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

/**
 * An unauthenticated server client, for endpoints that must not carry a token
 * (login, password reset). Keeping it separate avoids accidentally sending a
 * stale token to an endpoint that would then reject it.
 */
export const publicServerApi: ApiClient = createApiClient({
  baseUrl: serverEnv.API_URL,
  defaultTimeoutMs: serverEnv.API_TIMEOUT_MS,
});
