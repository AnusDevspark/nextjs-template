/**
 * The backend's wire contract, mirrored by hand.
 *
 * ---------------------------------------------------------------------------
 * Why hand-mirrored and not generated
 * ---------------------------------------------------------------------------
 * The API serves an OpenAPI document at `/api/docs.json`, and generating types
 * from it would keep this file in sync automatically. It is written by hand
 * anyway, for one reason: a generated file is not a place you can put a comment
 * explaining that validation failures are always 400, or that `message` is
 * omitted rather than null. Those rules are the part that actually breaks
 * integrations, and they live here next to the types they constrain.
 *
 * The safety net is tests, not codegen. `contract.test.ts` pins these shapes
 * against fixtures, and `e2e/contract.api.spec.ts` checks them against a live
 * backend. If the API changes, those fail.
 *
 * ---------------------------------------------------------------------------
 * What mirrors what
 * ---------------------------------------------------------------------------
 *   ApiSuccess / ApiPaginated / ApiFailure  ← src/shared/response/response-envelope.ts
 *   PaginationMeta                          ← src/shared/response/response-envelope.ts
 *   ERROR_CODES                             ← src/errors/app-error.ts
 *   FieldError                              ← src/errors/app-error.ts
 *
 * Keep the names identical to the backend's so a grep across both repos finds
 * both ends of any change. See API-CONTRACT.md for the prose version.
 */

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------

/**
 * Pagination metadata, present on list endpoints ONLY.
 *
 * `hasNextPage` / `hasPreviousPage` are supplied by the backend rather than
 * derived here — the server is the authority on whether more rows exist.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * A single-resource success.
 *
 * `message` is OMITTED, not null, when the endpoint has nothing to say. Narrow
 * with `"message" in body`, never `body.message !== null`.
 */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

/** A list success. Identical to ApiSuccess plus `meta`, with `data` an array. */
export interface ApiPaginated<T> {
  success: true;
  message?: string;
  data: T[];
  meta: PaginationMeta;
}

/** One field-level validation failure. */
export interface FieldError {
  /**
   * Dot-joined path into the request, e.g. `email` or `items.0.name`.
   *
   * When the failure is on the request root rather than a field — an object
   * refinement like "at least one field must be provided" — this is the source
   * name instead: `body`, `query` or `params`.
   */
  field: string;
  message: string;
}

/**
 * Every failure the API produces, at every status.
 *
 * Flat: there is no nested `error` object. `errors` appears only on validation
 * failures; `code` only where a client would branch on it.
 */
export interface ApiFailure {
  success: false;
  message: string;
  code?: ErrorCode;
  errors?: FieldError[];
  requestId?: string;
  /** Present outside production only. Never render it. */
  stack?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiPaginated<T> | ApiFailure;

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/**
 * Machine-readable failure codes. Mirrors the backend's ERROR_CODES exactly.
 *
 * Branch on these, never on `message` — messages are prose and change without
 * notice; codes are the stable contract.
 */
export const ERROR_CODES = {
  // Generic
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Authentication — the client behaves differently for each of these.
  AUTH_TOKEN_MISSING: "AUTH_TOKEN_MISSING",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_ACCOUNT_DISABLED: "AUTH_ACCOUNT_DISABLED",
  AUTH_SESSION_REVOKED: "AUTH_SESSION_REVOKED",

  // Authorization
  FORBIDDEN: "FORBIDDEN",
  PERMISSION_DENIED: "PERMISSION_DENIED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Codes where refreshing the access token cannot help.
 *
 * A 401 normally means "expired, go refresh". These three mean the session
 * itself is finished — the refresh family was revoked after a replay, or the
 * account was disabled. Attempting a refresh just adds a round trip before the
 * inevitable redirect to /login.
 */
export const TERMINAL_AUTH_CODES: readonly ErrorCode[] = [
  ERROR_CODES.AUTH_SESSION_REVOKED,
  ERROR_CODES.AUTH_ACCOUNT_DISABLED,
  ERROR_CODES.AUTH_INVALID_CREDENTIALS,
];

export function isTerminalAuthCode(code: string | undefined): boolean {
  return code !== undefined && TERMINAL_AUTH_CODES.includes(code as ErrorCode);
}

// ---------------------------------------------------------------------------
// Conventions that are easy to get wrong
// ---------------------------------------------------------------------------

/**
 * The backend's hard cap on `pageSize`.
 *
 * Exceeding it is a 400, NOT a silent clamp — so the frontend clamps to the
 * same number before sending. Mirrors PAGINATION_DEFAULTS.MAX_PAGE_SIZE.
 */
export const MAX_PAGE_SIZE = 100;

/** Mirrors PAGINATION_DEFAULTS.PAGE_SIZE. */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Pagination is ONE-indexed on both sides — no conversion needed.
 * Mirrors PAGINATION_DEFAULTS.PAGE.
 */
export const FIRST_PAGE = 1;

/**
 * Reminders the type system cannot enforce:
 *
 * - Validation failures are always **400**. The API never uses 422.
 * - Updates are **PATCH**. There are no PUT routes; a PUT is a 404.
 * - DELETE returns **204** with no body.
 * - Ids are UUID strings; timestamps are ISO-8601 strings, never Date.
 * - Field names are camelCase end to end. No case transformation anywhere.
 * - `x-request-id` is echoed on every response and repeated in error bodies.
 */

// ---------------------------------------------------------------------------
// Narrowing helpers
// ---------------------------------------------------------------------------

export function isApiFailure(body: unknown): body is ApiFailure {
  return typeof body === "object" && body !== null && (body as ApiFailure).success === false;
}

/** True for a success envelope carrying `meta` — i.e. a list response. */
export function isApiPaginated<T>(body: unknown): body is ApiPaginated<T> {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as ApiPaginated<T>).success === true &&
    Array.isArray((body as ApiPaginated<T>).data) &&
    typeof (body as ApiPaginated<T>).meta === "object"
  );
}
