import { NextResponse } from "next/server";

import { serverApi } from "@/lib/api/server-api";
import { clearAuthCookies } from "@/lib/auth/auth-cookies";

/**
 * POST /api/auth/logout
 *
 * Tells the backend to revoke the session, then clears the cookies.
 *
 * The cookie clear happens even if the backend call fails: a user who clicks
 * "sign out" must end up signed out locally regardless of what the API says.
 */
export async function POST() {
  try {
    await serverApi.post("/auth/logout", undefined, { retryOnUnauthorized: false });
  } catch {
    // Already-expired token, network failure — nothing actionable here.
  }

  await clearAuthCookies();

  return NextResponse.json({ success: true });
}
