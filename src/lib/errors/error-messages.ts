import { ApiError, isApiError } from "./api-error";

/**
 * Human-readable fallbacks by status.
 *
 * Backend messages win whenever they exist — this only covers the case where
 * the API returned nothing useful, or where the raw message would be noise
 * (a stack trace, a driver error, an HTML page).
 */
const STATUS_FALLBACKS: Record<number, string> = {
  0: "Could not reach the server. Check your connection and try again.",
  400: "The request could not be processed. Please review the form and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "We could not find what you were looking for.",
  408: "The request took too long. Please try again.",
  409: "This conflicts with existing data.",
  422: "Some of the information provided is not valid.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "The server is temporarily unavailable. Please try again.",
  503: "The service is temporarily unavailable. Please try again shortly.",
  504: "The server took too long to respond. Please try again.",
};

/**
 * The message to show a user for any thrown value.
 *
 * Use this everywhere instead of `error.message` so unexpected throws never
 * render a stack trace or `[object Object]` into the UI.
 */
export function getErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (isApiError(error)) {
    // 5xx bodies frequently contain internals. Prefer our own wording.
    if (error.isServerError) {
      return STATUS_FALLBACKS[error.status] ?? STATUS_FALLBACKS[500]!;
    }
    if (error.message && !looksLikeNoise(error.message)) {
      return error.message;
    }
    return STATUS_FALLBACKS[error.status] ?? fallback;
  }

  if (error instanceof Error && error.message && !looksLikeNoise(error.message)) {
    return error.message;
  }

  return fallback;
}

/**
 * A short title for error states, e.g. the heading above `getErrorMessage`.
 */
export function getErrorTitle(error: unknown): string {
  if (!isApiError(error)) return "Something went wrong";

  if (error.isNetworkError) return "Connection problem";
  if (error.isUnauthorized) return "Session expired";
  if (error.isForbidden) return "Access denied";
  if (error.isNotFound) return "Not found";
  if (error.isValidationError) return "Invalid data";
  if (error.isServerError) return "Server error";

  return "Something went wrong";
}

/**
 * Errors carrying field-level detail belong inside the form, not in a toast.
 * Toasting them duplicates a message the user can already see next to the input.
 */
export function shouldToastError(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return !error.hasFieldErrors();
}

/** Support-friendly suffix, e.g. "Reference: req_01H…". */
export function getErrorReference(error: unknown): string | undefined {
  return isApiError(error) && error.requestId ? `Reference: ${error.requestId}` : undefined;
}

function looksLikeNoise(message: string): boolean {
  return (
    message.length > 200 ||
    message.includes("<!DOCTYPE") ||
    message.includes("\n    at ") ||
    message.startsWith("[object ")
  );
}

export { ApiError };
