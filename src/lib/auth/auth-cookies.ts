import "server-only";

import { cookies } from "next/headers";

import { isProduction, serverEnv } from "@/config/server-env";

/**
 * Cookie handling for the auth BFF.
 *
 * Both tokens are HttpOnly, so neither is readable from JavaScript. The access
 * token is additionally handed to the browser *in memory* by
 * `/api/auth/session` when running in `direct` mode, because a cookie set on
 * the Next.js origin cannot be sent to a different API origin.
 */

const BASE_COOKIE = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
} as const;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires, as reported by the backend. */
  expiresIn?: number;
}

export async function setAuthCookies(tokens: AuthTokens): Promise<void> {
  const store = await cookies();

  store.set(serverEnv.AUTH_ACCESS_COOKIE, tokens.accessToken, {
    ...BASE_COOKIE,
    // Outlive the token itself slightly so an expired-but-present cookie can
    // still drive a refresh instead of looking like a logged-out user.
    maxAge: (tokens.expiresIn ?? 900) + 60,
  });

  store.set(serverEnv.AUTH_REFRESH_COOKIE, tokens.refreshToken, {
    ...BASE_COOKIE,
    maxAge: serverEnv.AUTH_REFRESH_MAX_AGE,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(serverEnv.AUTH_ACCESS_COOKIE);
  store.delete(serverEnv.AUTH_REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(serverEnv.AUTH_ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(serverEnv.AUTH_REFRESH_COOKIE)?.value;
}
