import { z } from "zod";

/**
 * The authenticated user as the frontend needs it.
 *
 * Parsed with Zod rather than cast, because this crosses a trust boundary: a
 * backend change that drops `permissions` would otherwise turn into a silent
 * "everything is hidden" bug instead of a loud parse failure.
 *
 * Mirrors the backend's `SessionUserResponse` (src/modules/user/user.types.ts).
 * Note `role` is a single string, not an array: the API models one role per
 * user, and pretending otherwise here would invent a shape the server never
 * sends. Authorization decisions use `permissions`, never `role` — see
 * `src/lib/permissions/permissions.ts`.
 */
export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  role: z.string().default(""),
  /**
   * Defaulted rather than required so a role with zero grants parses cleanly —
   * the seeded USER role legitimately has none.
   */
  permissions: z.array(z.string()).default([]),
  avatarUrl: z.string().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Mirrors the backend's `AuthTokens`. `expiresIn` is in SECONDS. */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().optional(),
  tokenType: z.literal("Bearer").optional(),
});

export type AuthTokens = z.infer<typeof authTokensSchema>;

/**
 * The API wraps every success in `{ success, message?, data }` — auth included.
 *
 * There is no flat variant: /auth/login, /auth/register and /auth/refresh all
 * return the envelope below. Unwrapping happens in the route handlers under
 * `src/app/api/auth/`, which are the only files that see the raw body.
 */
const authResultEnvelopeSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.object({
    user: sessionUserSchema,
    tokens: authTokensSchema,
  }),
});

export const loginResponseSchema = authResultEnvelopeSchema;
export type LoginResponse = z.infer<typeof loginResponseSchema>;

/**
 * Refresh returns the same envelope as login, user included.
 *
 * The frontend only needs the tokens, but the API sends the user too — and
 * re-reading it on refresh is useful: it picks up a role or permission change
 * without waiting for the next full page load.
 */
export const refreshResponseSchema = authResultEnvelopeSchema;
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

/** GET /auth/me — the session user in a plain success envelope, no tokens. */
export const sessionUserEnvelopeSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: sessionUserSchema,
});

export interface LoginCredentials {
  email: string;
  password: string;
}

export function getUserDisplayName(user: SessionUser): string {
  const name = user.fullName?.trim() || `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

export function getUserInitials(user: SessionUser): string {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  return (initials || user.email[0] || "?").toUpperCase();
}
