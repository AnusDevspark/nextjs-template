import { ApiError, type ApiFieldError } from "./api-error";

/**
 * Turns whatever the backend returned into an `ApiError`.
 *
 * Backends are rarely consistent about error envelopes, so this reads several
 * common shapes. Everything it does not recognise falls back to the HTTP status
 * line, which is always better than throwing while handling an error.
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  const requestId =
    response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? undefined;

  let body: unknown;
  try {
    const text = await response.text();
    body = text ? (JSON.parse(text) as unknown) : undefined;
  } catch {
    // Non-JSON body (HTML error page, empty 502 from a load balancer, ...).
    body = undefined;
  }

  const record = isRecord(body) ? body : undefined;

  return new ApiError({
    status: response.status,
    code: readString(record, ["code", "errorCode", "error_code"]),
    message:
      readString(record, ["message", "error", "detail", "title"]) ??
      response.statusText ??
      `Request failed with status ${response.status}`,
    errors: readFieldErrors(record),
    requestId: requestId ?? readString(record, ["requestId", "request_id", "traceId"]),
    details: body,
  });
}

/**
 * Normalizes a thrown value from `fetch` (DNS failure, offline, abort, timeout)
 * into an `ApiError` with status 0.
 */
export function toNetworkError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const isAbort = error instanceof DOMException && error.name === "AbortError";
  const isTimeout = error instanceof DOMException && error.name === "TimeoutError";

  if (isTimeout) {
    return new ApiError({
      status: 408,
      code: "REQUEST_TIMEOUT",
      message: "The request took too long and was cancelled.",
      cause: error,
    });
  }

  if (isAbort) {
    return new ApiError({
      status: 0,
      code: "REQUEST_ABORTED",
      message: "The request was cancelled.",
      cause: error,
    });
  }

  return new ApiError({
    status: 0,
    code: "NETWORK_ERROR",
    message: "Could not reach the server. Check your connection and try again.",
    cause: error,
  });
}

/**
 * Reads field-level errors from the shapes we see most often:
 *
 *   errors: [{ path: "email", message: "..." }]
 *   errors: [{ field: "email", message: "..." }]
 *   errors: { email: "Taken" }
 *   errors: { email: ["Taken", "Too long"] }
 *   fieldErrors / validationErrors / details as any of the above
 */
function readFieldErrors(body: Record<string, unknown> | undefined): ApiFieldError[] {
  if (!body) return [];

  const raw =
    body.errors ?? body.fieldErrors ?? body.validationErrors ?? body.details ?? body.violations;

  if (Array.isArray(raw)) {
    return raw.flatMap((entry): ApiFieldError[] => {
      if (!isRecord(entry)) return [];

      const path = readString(entry, ["path", "field", "name", "property", "param"]);
      const message = readString(entry, ["message", "error", "detail", "reason"]);
      if (!path || !message) return [];

      return [{ path, message, code: readString(entry, ["code", "rule"]) }];
    });
  }

  if (isRecord(raw)) {
    return Object.entries(raw).flatMap(([path, value]): ApiFieldError[] => {
      if (typeof value === "string") return [{ path, message: value }];
      if (Array.isArray(value) && typeof value[0] === "string") {
        return [{ path, message: value[0] }];
      }
      return [];
    });
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!record) return undefined;

  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}
