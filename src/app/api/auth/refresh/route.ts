import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { publicServerApi } from "@/lib/api/server-api";
import { clearAuthCookies, getRefreshToken, setAuthCookies } from "@/lib/auth/auth-cookies";
import { refreshResponseSchema } from "@/types/auth";

/**
 * POST /api/auth/refresh
 *
 * Rotates the session using the HttpOnly refresh cookie. The browser never
 * sees the refresh token — it just calls this endpoint and gets a fresh access
 * token back (in `direct` mode) or an updated cookie (in `proxy` mode).
 *
 * Client-side concurrency is handled in `client-api.ts`: every parallel 401
 * awaits one shared promise, so this endpoint is hit once, not once per
 * in-flight request.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    return NextResponse.json(
      { code: "NO_REFRESH_TOKEN", message: "No active session." },
      { status: 401 },
    );
  }

  try {
    const raw = await publicServerApi.post<unknown>("/auth/refresh", { refreshToken });
    // Rotation: the token just sent is now dead and the response carries its
    // replacement. Both cookies must be rewritten, not just the access one.
    const { tokens } = refreshResponseSchema.parse(raw).data;

    await setAuthCookies({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });

    return NextResponse.json({
      accessToken: env.NEXT_PUBLIC_API_MODE === "direct" ? tokens.accessToken : undefined,
    });
  } catch {
    // A refresh token that the backend rejects is unrecoverable: drop the
    // cookies so the app stops retrying and shows the login screen.
    await clearAuthCookies();

    return NextResponse.json(
      { code: "REFRESH_FAILED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }
}
