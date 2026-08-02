/**
 * A single field-scoped validation failure from the backend.
 *
 * `path` uses dot/bracket notation matching the request body shape
 * (`"email"`, `"address.city"`, `"contacts[0].phone"`) so it can be handed
 * straight to React Hook Form's `setError`.
 */
export interface ApiFieldError {
  path: string;
  message: string;
  code?: string;
}

export interface ApiErrorOptions {
  status: number;
  code?: string;
  message: string;
  errors?: ApiFieldError[];
  requestId?: string;
  /** Raw parsed body, kept for debugging and for bespoke error handling. */
  details?: unknown;
  cause?: unknown;
}

/**
 * The single error type every layer above the API client deals with.
 *
 * Network failures, timeouts, non-JSON responses and structured backend errors
 * are all normalized into this shape by `parseApiError`, so no component ever
 * has to branch on "was this a fetch rejection or a 422?".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errors: ApiFieldError[];
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code ?? inferCode(options.status);
    this.errors = options.errors ?? [];
    this.requestId = options.requestId;
    this.details = options.details;
  }

  /** 0 is used for failures that never reached the server (network/abort). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** 400/409/422 carry field errors worth surfacing inside a form. */
  get isValidationError(): boolean {
    return this.status === 422 || this.status === 400 || this.status === 409;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** True when retrying the identical request could plausibly succeed. */
  get isRetryable(): boolean {
    return this.isNetworkError || this.status === 429 || this.isServerError;
  }

  hasFieldErrors(): boolean {
    return this.errors.length > 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const STATUS_CODES: Record<number, string> = {
  0: "NETWORK_ERROR",
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  408: "REQUEST_TIMEOUT",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};

function inferCode(status: number): string {
  return STATUS_CODES[status] ?? (status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED");
}
