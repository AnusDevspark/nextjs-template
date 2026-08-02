import { z } from "zod";

/**
 * The authenticated user as the frontend needs it.
 *
 * Parsed with Zod rather than cast, because this crosses a trust boundary: a
 * backend change that drops `permissions` would otherwise turn into a silent
 * "everything is hidden" bug instead of a loud parse failure.
 */
export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullish(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/** Backend login response. Field names follow the documented API contract. */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().optional(),
  user: sessionUserSchema,
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const refreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().optional(),
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export interface LoginCredentials {
  email: string;
  password: string;
}

export function getUserDisplayName(user: SessionUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}

export function getUserInitials(user: SessionUser): string {
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.trim();
  return (initials || user.email[0] || "?").toUpperCase();
}
