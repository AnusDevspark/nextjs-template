import { z } from "zod";

/**
 * Browser-safe configuration.
 *
 * Every value here is inlined into the client bundle at build time, so
 * `process.env.NEXT_PUBLIC_*` must be referenced with a literal key — Next.js
 * performs a textual replacement and cannot resolve dynamic lookups.
 *
 * Never put a secret in this file. See `src/config/server-env.ts` for values
 * that must stay on the server.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Acme Admin"),
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),

  /** Base URL of the Node.js REST API, e.g. `https://api.acme.com/v1`. */
  NEXT_PUBLIC_API_URL: z.url(),

  /**
   * How the browser reaches the Node API for *data* requests.
   *
   * - `direct` — browser calls NEXT_PUBLIC_API_URL directly. Requires the API
   *   to send permissive CORS headers for the app origin. Fewest hops.
   * - `proxy`  — browser calls `/api/bff/*` on this Next.js app, which forwards
   *   to the Node API. Use when you cannot configure CORS, or when the access
   *   token must never be readable by JavaScript.
   *
   * Authentication always goes through the Next.js BFF regardless of this
   * setting — see `src/app/api/auth/`.
   */
  NEXT_PUBLIC_API_MODE: z.enum(["direct", "proxy"]).default("direct"),

  /** Optional. When absent, Sentry wiring stays inert. */
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(
    `Invalid public environment variables:\n${issues}\n\nCopy .env.example to .env.local and fill in the missing values.`,
  );
}

export const env: PublicEnv = parsed.data;

/**
 * Base URL the browser should use for resource data requests.
 *
 * In `proxy` mode this is a same-origin path, which means cookies are sent
 * automatically and no CORS preflight occurs.
 */
export const clientApiBaseUrl =
  env.NEXT_PUBLIC_API_MODE === "proxy" ? "/api/bff" : env.NEXT_PUBLIC_API_URL;
