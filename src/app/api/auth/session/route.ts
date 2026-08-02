import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { getAccessToken } from "@/lib/auth/auth-cookies";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/auth/session
 *
 * Seeds the browser on boot: returns the current user and, in `direct` mode,
 * the access token that `clientApi` holds in memory.
 *
 * `no-store` matters — a cached session response would serve one user's
 * identity to the next.
 */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { user: null, accessToken: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const accessToken = env.NEXT_PUBLIC_API_MODE === "direct" ? await getAccessToken() : null;

  return NextResponse.json(
    { user: session.user, accessToken: accessToken ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
