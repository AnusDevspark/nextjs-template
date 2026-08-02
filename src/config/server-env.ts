import "server-only";

import { z } from "zod";

/**
 * Server-only configuration.
 *
 * The `server-only` import makes any accidental client import a build error,
 * so secrets in this module can never leak into the browser bundle.
 */
const serverEnvSchema = z.object({
  /**
   * Base URL the Next.js server uses to reach the Node API. Usually identical
   * to NEXT_PUBLIC_API_URL, but can point at an internal hostname that is not
   * reachable from the public internet.
   */
  API_URL: z.url(),

  /** Milliseconds before a server-issued API request is aborted. */
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),

  /**
   * Set to "true" to allow `/api/bff/*` to forward arbitrary paths to the Node
   * API. Leave off unless you actually run in `NEXT_PUBLIC_API_MODE=proxy`.
   */
  API_PROXY_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  /** Cookie name for the short-lived access token. */
  AUTH_ACCESS_COOKIE: z.string().default("acme_at"),

  /** Cookie name for the long-lived refresh token. Never readable by JS. */
  AUTH_REFRESH_COOKIE: z.string().default("acme_rt"),

  /** Refresh cookie lifetime in seconds. Defaults to 30 days. */
  AUTH_REFRESH_MAX_AGE: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const parsed = serverEnvSchema.safeParse({
  API_URL: process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL,
  API_TIMEOUT_MS: process.env.API_TIMEOUT_MS,
  API_PROXY_ENABLED: process.env.API_PROXY_ENABLED,
  AUTH_ACCESS_COOKIE: process.env.AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE: process.env.AUTH_REFRESH_COOKIE,
  AUTH_REFRESH_MAX_AGE: process.env.AUTH_REFRESH_MAX_AGE,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Invalid server environment variables:\n${issues}`);
}

export const serverEnv: ServerEnv = parsed.data;

export const isProduction = serverEnv.NODE_ENV === "production";
