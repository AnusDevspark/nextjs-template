import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { getErrorMessage, getErrorTitle, shouldToastError } from "./error-messages";
import { parseApiError, toNetworkError } from "./parse-api-error";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 400,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

/**
 * Error normalization is what lets every component handle failures the same
 * way. Backends are inconsistent about error envelopes, so these cases are the
 * shapes worth being tolerant of.
 */
describe("parseApiError", () => {
  it("reads the documented envelope", async () => {
    const error = await parseApiError(
      jsonResponse(
        {
          success: false,
          code: "PROVIDER_EMAIL_EXISTS",
          message: "Provider already exists",
          errors: [{ path: "email", message: "Email already exists" }],
        },
        { status: 409 },
      ),
    );

    expect(error.status).toBe(409);
    expect(error.code).toBe("PROVIDER_EMAIL_EXISTS");
    expect(error.message).toBe("Provider already exists");
    expect(error.errors).toEqual([
      { path: "email", message: "Email already exists", code: undefined },
    ]);
    expect(error.isValidationError).toBe(true);
  });

  it("accepts `field` instead of `path`", async () => {
    const error = await parseApiError(
      jsonResponse(
        { message: "Invalid", errors: [{ field: "npi", message: "Too short" }] },
        { status: 422 },
      ),
    );

    expect(error.errors).toEqual([{ path: "npi", message: "Too short", code: undefined }]);
  });

  it("accepts a map of field to message", async () => {
    const error = await parseApiError(
      jsonResponse(
        { message: "Invalid", errors: { email: "Taken", npi: ["Too short", "Bad"] } },
        { status: 422 },
      ),
    );

    expect(error.errors).toEqual([
      { path: "email", message: "Taken" },
      { path: "npi", message: "Too short" },
    ]);
  });

  it("falls back to the status line for a non-JSON body", async () => {
    const error = await parseApiError(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      }),
    );

    expect(error.status).toBe(502);
    expect(error.code).toBe("BAD_GATEWAY");
    expect(error.isServerError).toBe(true);
  });

  it("captures the request id header for support references", async () => {
    const error = await parseApiError(
      jsonResponse({ message: "Nope" }, { status: 400, headers: { "x-request-id": "req_123" } }),
    );

    expect(error.requestId).toBe("req_123");
  });
});

describe("toNetworkError", () => {
  it("maps a timeout to 408", () => {
    const error = toNetworkError(new DOMException("timeout", "TimeoutError"));

    expect(error.status).toBe(408);
    expect(error.code).toBe("REQUEST_TIMEOUT");
  });

  it("maps an abort to status 0 without claiming a server failure", () => {
    const error = toNetworkError(new DOMException("aborted", "AbortError"));

    expect(error.status).toBe(0);
    expect(error.code).toBe("REQUEST_ABORTED");
  });

  it("maps an unknown throw to a network error", () => {
    expect(toNetworkError(new TypeError("Failed to fetch")).isNetworkError).toBe(true);
  });

  it("passes an ApiError through unchanged", () => {
    const original = new ApiError({ status: 403, message: "No" });
    expect(toNetworkError(original)).toBe(original);
  });
});

describe("error presentation", () => {
  it("hides raw 5xx messages behind neutral wording", () => {
    const error = new ApiError({
      status: 500,
      message: "PG::UniqueViolation: duplicate key value violates constraint",
    });

    expect(getErrorMessage(error)).not.toContain("PG::");
    expect(getErrorTitle(error)).toBe("Server error");
  });

  it("keeps a useful 4xx message", () => {
    expect(getErrorMessage(new ApiError({ status: 409, message: "Provider already exists" }))).toBe(
      "Provider already exists",
    );
  });

  it("does not toast errors that belong inside a form", () => {
    const withFields = new ApiError({
      status: 422,
      message: "Invalid",
      errors: [{ path: "email", message: "Taken" }],
    });

    expect(shouldToastError(withFields)).toBe(false);
    expect(shouldToastError(new ApiError({ status: 500, message: "Boom" }))).toBe(true);
  });

  it("only retries genuinely transient failures", () => {
    expect(new ApiError({ status: 0, message: "" }).isRetryable).toBe(true);
    expect(new ApiError({ status: 503, message: "" }).isRetryable).toBe(true);
    expect(new ApiError({ status: 429, message: "" }).isRetryable).toBe(true);
    expect(new ApiError({ status: 403, message: "" }).isRetryable).toBe(false);
    expect(new ApiError({ status: 422, message: "" }).isRetryable).toBe(false);
  });
});
