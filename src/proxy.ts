import { NextResponse, type NextRequest } from "next/server";

/**
 * Request-time routing (Next.js 16 renamed `middleware` to `proxy`).
 *
 * Two jobs, both about the *transport* of the session, never about its meaning:
 *
 * 1. Bounce visitors with no session cookie at all away from private routes, so
 *    the app shell never flashes for someone who is signed out.
 * 2. Recover a session whose access cookie has expired but whose refresh cookie
 *    is still alive. Server Components cannot write cookies, so `getSession`
 *    can only read the access token it is given — without this step an idle
 *    user is treated as signed out while holding a perfectly good refresh
 *    token.
 *
 * It never decides that a session is *valid*. Cookie presence is not proof, so
 * the real gate stays in `requireSession` / `requirePermission`, and behind
 * those, the backend.
 *
 * Deliberately self-contained: the docs warn against proxy relying on shared
 * modules, so config is read straight from `process.env` rather than importing
 * `serverEnv`.
 */

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE ?? "acme_at";
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE ?? "acme_rt";
const API_URL = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";
const REFRESH_MAX_AGE = Number(process.env.AUTH_REFRESH_MAX_AGE ?? 60 * 60 * 24 * 30);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

const BASE_COOKIE = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax",
  path: "/",
} as const;

interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

/**
 * In-flight refreshes, keyed by the token being spent.
 *
 * Refresh tokens rotate and are single-use: presenting one twice looks like a
 * replay to the API, which revokes the whole rotation family and logs the user
 * out for real. Two overlapping requests must therefore share one round trip,
 * exactly as `client-api.ts` does in the browser.
 *
 * This collapses overlap within a single server process. It is not a
 * distributed lock — but combined with skipping prefetches below, the only way
 * to race is to open several tabs in the same instant, and the loser of that
 * race still lands on the login page rather than in a redirect loop.
 */
const inFlightRefreshes = new Map<string, Promise<RefreshedTokens | null>>();

/** Never rejects: a failed refresh is `null`, which means "sign them out". */
async function requestNewTokens(refreshToken: string): Promise<RefreshedTokens | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { data?: { tokens?: Partial<RefreshedTokens> } };
    const tokens = body.data?.tokens;

    if (!tokens?.accessToken || !tokens.refreshToken) return null;

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  } catch {
    return null;
  }
}

function refreshTokens(refreshToken: string): Promise<RefreshedTokens | null> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) return existing;

  const promise = requestNewTokens(refreshToken);
  inFlightRefreshes.set(refreshToken, promise);
  void promise.finally(() => {
    inFlightRefreshes.delete(refreshToken);
  });

  return promise;
}

/**
 * Router prefetches fire in parallel and in the background. Spending a
 * single-use refresh token on one would race the real navigation, so they are
 * left alone — the navigation that follows does the refresh.
 */
function isPrefetch(request: NextRequest): boolean {
  return request.headers.has("next-router-prefetch");
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function loginRedirect(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;

  // Preserve the destination so login can send the user back.
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

/** Signed out for good: drop both cookies so nothing retries with them. */
function signOut(request: NextRequest, isPublic: boolean): NextResponse {
  const response = isPublic ? NextResponse.next() : loginRedirect(request);

  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);

  return response;
}

/**
 * Continue into the render with the rotated tokens.
 *
 * They go on the *request* as well as the response: the page about to render
 * reads `cookies()` from the incoming request, so setting only the response
 * would refresh the session for the next request and leave this one looking
 * signed out.
 */
function continueWithTokens(request: NextRequest, tokens: RefreshedTokens): NextResponse {
  request.cookies.set(ACCESS_COOKIE, tokens.accessToken);
  request.cookies.set(REFRESH_COOKIE, tokens.refreshToken);

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });

  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...BASE_COOKIE,
    // Outlive the token itself slightly, so an expired-but-present cookie can
    // still drive a refresh instead of looking like a logged-out user.
    maxAge: (tokens.expiresIn ?? 900) + 60,
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...BASE_COOKIE,
    maxAge: REFRESH_MAX_AGE,
  });

  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  const hasAccessCookie = request.cookies.has(ACCESS_COOKIE);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  /*
   * Nothing here redirects a signed-in user away from /login. That decision
   * needs to know whether the session is real, which only `getSession` on the
   * login page can answer. Doing it here from cookie presence is what used to
   * deadlock the app: a stale access cookie made the page redirect to /login,
   * and the surviving refresh cookie made the proxy redirect straight back.
   */

  if (!hasAccessCookie && refreshToken && !isPrefetch(request)) {
    const tokens = await refreshTokens(refreshToken);

    return tokens ? continueWithTokens(request, tokens) : signOut(request, isPublic);
  }

  if (isPublic) return NextResponse.next();

  // A prefetch with only a refresh cookie is let through untouched: it is not a
  // navigation, and the refresh it needs happens when the user actually clicks.
  const hasSession = hasAccessCookie || Boolean(refreshToken);
  if (!hasSession) return loginRedirect(request);

  return NextResponse.next();
}

export const config = {
  /**
   * Skip Next internals, the auth BFF (which must stay reachable while signed
   * out) and static assets.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
