import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { Permission } from "@/constants/permissions";
import { serverApi } from "@/lib/api/server-api";
import { isApiError } from "@/lib/errors";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  toPermissionSet,
  type PermissionSet,
} from "@/lib/permissions/permissions";
import { sessionUserSchema, type SessionUser } from "@/types/auth";

import { getAccessToken } from "./auth-cookies";

export interface Session {
  user: SessionUser;
  permissions: PermissionSet;
}

/**
 * The current session, or `null` when signed out.
 *
 * Wrapped in React's `cache` so a layout, a page and three components in the
 * same render all share one `GET /auth/me` round trip.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const raw = await serverApi.get<unknown>("/auth/me", { retryOnUnauthorized: false });
    const user = sessionUserSchema.parse(unwrapUser(raw));

    return { user, permissions: toPermissionSet(user.permissions) };
  } catch (error) {
    // An expired or rejected access token is an ordinary signed-out state. The
    // recovery for it happens in `proxy.ts`, which spends the refresh cookie
    // before this ever runs — a Server Component cannot write the new cookie
    // itself.
    if (isApiError(error) && (error.isUnauthorized || error.isForbidden)) return null;

    /*
     * Everything else is a broken backend, not a signed-out user, and the
     * difference matters: returning null here would bounce a perfectly valid
     * session to /login and hide an outage behind a login form nobody can get
     * through. So it throws — but as one named error rather than a raw Zod
     * issue or a bare fetch failure, because the stack that reaches the server
     * log is otherwise a schema path with no hint that /auth/me was involved.
     *
     * The boundary that catches this is `app/error.tsx`: the throw happens in
     * the dashboard *layout*, so the segment's own error file never sees it.
     * That page offers a sign-out, which is the escape hatch for a cookie the
     * backend can no longer resolve.
     */
    throw new SessionLookupError(error);
  }
});

/** A `/auth/me` failure that is not a 401 or 403 — i.e. not a logged-out user. */
export class SessionLookupError extends Error {
  readonly cause: unknown;

  constructor(cause: unknown) {
    super(`Could not resolve the session: GET /auth/me failed. ${describe(cause)}`);
    this.name = "SessionLookupError";
    this.cause = cause;
  }
}

function describe(cause: unknown): string {
  if (isApiError(cause)) {
    return `Status ${cause.status}${cause.code ? ` (${cause.code})` : ""}.`;
  }
  if (cause instanceof Error) return cause.message;
  return String(cause);
}

/** The session, or a redirect to `/login` carrying the current path. */
export async function requireSession(returnTo?: string): Promise<Session> {
  const session = await getSession();
  if (session) return session;

  const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
  redirect(target);
}

/**
 * Server-side permission gate for a page or layout.
 *
 * Redirects to `/login` when signed out and `/forbidden` when signed in but
 * unauthorised — distinct outcomes, because "log in again" is useless advice
 * for someone who is already logged in.
 *
 * This is UX, not security. The backend must reject the same request too.
 */
export async function requirePermission(
  required: Permission | Permission[],
  options: { returnTo?: string } = {},
): Promise<Session> {
  const session = await requireSession(options.returnTo);

  const allowed = Array.isArray(required)
    ? hasAllPermissions(session.permissions, required)
    : hasPermission(session.permissions, required);

  if (!allowed) redirect("/forbidden");

  return session;
}

/** As `requirePermission`, but any one of `required` is enough. */
export async function requireAnyPermission(
  required: Permission[],
  options: { returnTo?: string } = {},
): Promise<Session> {
  const session = await requireSession(options.returnTo);

  if (!hasAnyPermission(session.permissions, required)) redirect("/forbidden");

  return session;
}

/** Non-redirecting check, for conditionally rendering part of a server page. */
export async function sessionCan(required: Permission | Permission[]): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  return Array.isArray(required)
    ? hasAllPermissions(session.permissions, required)
    : hasPermission(session.permissions, required);
}

/**
 * Accepts `{ user }`, `{ data }` or a bare user object, so a backend that wraps
 * `/auth/me` in an envelope does not require an adapter for this one endpoint.
 */
function unwrapUser(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;

  const record = raw as Record<string, unknown>;
  if (record.user && typeof record.user === "object") return record.user;
  if (record.data && typeof record.data === "object") return record.data;

  return raw;
}
