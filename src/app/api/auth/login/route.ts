import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { env } from "@/config/env";
import { publicServerApi } from "@/lib/api/server-api";
import { setAuthCookies } from "@/lib/auth/auth-cookies";
import { getErrorMessage, isApiError } from "@/lib/errors";
import { loginResponseSchema } from "@/types/auth";

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login
 *
 * Exchanges credentials for a session. The tokens returned by the Node API are
 * written to HttpOnly cookies here and never sent to the browser as JSON —
 * except the access token in `direct` mode, where the browser must attach it to
 * cross-origin requests itself.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const raw = await publicServerApi.post<unknown>("/auth/login", parsed.data);
    const result = loginResponseSchema.parse(raw);

    await setAuthCookies({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });

    return NextResponse.json({
      user: result.user,
      // Only exposed when the browser has to talk to the API directly.
      accessToken: env.NEXT_PUBLIC_API_MODE === "direct" ? result.accessToken : undefined,
    });
  } catch (error) {
    if (isApiError(error)) {
      return NextResponse.json(
        { code: error.code, message: getErrorMessage(error), errors: error.errors },
        { status: error.status === 0 ? 502 : error.status },
      );
    }

    return NextResponse.json(
      { code: "LOGIN_FAILED", message: "Could not sign you in. Please try again." },
      { status: 500 },
    );
  }
}
