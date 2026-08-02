import { NextResponse, type NextRequest } from "next/server";

/**
 * Request-time routing (Next.js 16 renamed `middleware` to `proxy`).
 *
 * Deliberately shallow. It only answers "is there a session cookie?" to avoid a
 * flash of the app shell for signed-out visitors, and to bounce signed-in users
 * away from `/login`.
 *
 * It does **not** verify the token or check permissions. Cookie presence is not
 * proof of a valid session, so the real gate lives in `requireSession` /
 * `requirePermission` on the server — and behind those, the backend. Doing
 * domain authorization here would mean a network call on every request.
 */

const ACCESS_COOKIE = process.env.AUTH_ACCESS_COOKIE ?? "acme_at";
const REFRESH_COOKIE = process.env.AUTH_REFRESH_COOKIE ?? "acme_rt";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // A refresh cookie alone is enough to attempt a session: the access token may
  // have expired while the user was idle, and the app can refresh on boot.
  const hasSession = request.cookies.has(ACCESS_COOKIE) || request.cookies.has(REFRESH_COOKIE);

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (isPublic) {
    if (hasSession && pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the destination so login can send the user back.
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

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
