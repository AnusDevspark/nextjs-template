import { NextResponse } from "next/server";

import { publicServerApi } from "@/lib/api/server-api";
import { clearAuthCookies, getRefreshToken } from "@/lib/auth/auth-cookies";

/**
 * POST /api/auth/logout
 *
 * Revokes the session server-side, then clears the cookies.
 *
 * The refresh token has to be in the BODY. The backend's logout endpoint takes
 * `{ refreshToken }` and deliberately runs without the authenticate middleware,
 * so that signing out still works when the access token has already expired —
 * which is exactly when people tend to click "sign out". Posting an empty body
 * gets a 400 and revokes nothing, leaving the refresh token live for its full
 * lifetime; that failure is invisible from the UI, which is what makes it worth
 * a comment.
 *
 * `publicServerApi`, not `serverApi`: no Authorization header is wanted or
 * needed here, and an expired one would only add a pointless 401.
 *
 * The cookie clear happens even if the backend call fails — a user who clicks
 * "sign out" must end up signed out locally regardless of what the API says.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    try {
      await publicServerApi.post("/auth/logout", { refreshToken });
    } catch {
      // Already-revoked token, network failure — nothing actionable here, and
      // the local sign-out below happens either way.
    }
  }

  await clearAuthCookies();

  return NextResponse.json({ success: true });
}
