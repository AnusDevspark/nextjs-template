import { describe, expect, it } from "vitest";

import { parseApiError } from "@/lib/errors";

import {
  ERROR_CODES,
  MAX_PAGE_SIZE,
  isApiFailure,
  isApiPaginated,
  isTerminalAuthCode,
  type ApiFailure,
  type ApiPaginated,
  type ApiSuccess,
} from "./contract";

/**
 * Contract tests.
 *
 * The types in `contract.ts` are mirrored from the backend by hand, so nothing
 * stops them drifting except these fixtures. Each one below is a verbatim body
 * the API produces — copy them from `API-CONTRACT.md`, not from imagination.
 *
 * This suite runs without a backend. `e2e/contract.api.spec.ts` checks the same
 * shapes against a live one; this is the fast half of the same guarantee.
 */

// --- Fixtures: real response bodies ----------------------------------------

const LOGIN_SUCCESS = {
  success: true,
  message: "Logged in successfully.",
  data: {
    user: {
      id: "1a0ba0f0-441a-40f5-87d7-793c217b9349",
      firstName: "Admin",
      lastName: "User",
      fullName: "Admin User",
      email: "admin@example.com",
      status: "ACTIVE",
      role: "SUPER_ADMIN",
      createdAt: "2026-08-20T16:43:08.831Z",
      updatedAt: "2026-08-20T16:43:08.831Z",
      permissions: ["ROLE_MANAGE", "USER_CREATE", "USER_DELETE", "USER_EDIT", "USER_VIEW"],
    },
    tokens: {
      accessToken: "eyJhbGciOiJIUzI1NiJ9.stub",
      refreshToken: "eyJhbGciOiJIUzI1NiJ9.stub",
      expiresIn: 900,
      tokenType: "Bearer",
    },
  },
};

const USER_LIST = {
  success: true,
  data: [
    {
      id: "507b0da3-bbfd-4237-896d-b69f26275546",
      firstName: "Johanna",
      lastName: "Weiss",
      fullName: "Johanna Weiss",
      email: "johanna.weiss@example.com",
      status: "SUSPENDED",
      role: "USER",
      createdAt: "2026-08-20T16:43:08.895Z",
      updatedAt: "2026-08-20T16:43:08.895Z",
    },
  ],
  meta: {
    page: 1,
    pageSize: 2,
    total: 6,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

const VALIDATION_FAILURE = {
  success: false,
  message: "Validation failed",
  code: "VALIDATION_FAILED",
  errors: [{ field: "pageSize", message: "pageSize cannot exceed 100" }],
  requestId: "899aed0e-8a43-4a5c-8a96-967247d289fb",
};

const UNAUTHORIZED = {
  success: false,
  message: "Authentication required",
  code: "AUTH_TOKEN_MISSING",
  requestId: "e9148884-76d1-4f30-adf5-591bf6b546d1",
};

// --- Envelope shape ---------------------------------------------------------

describe("success envelope", () => {
  it("carries `data`, and `message` only when the endpoint says something", () => {
    const withMessage = LOGIN_SUCCESS as ApiSuccess<unknown>;
    expect(withMessage.success).toBe(true);
    expect(withMessage.message).toBe("Logged in successfully.");

    // The list endpoint has nothing to say, so `message` is absent — not null.
    expect("message" in USER_LIST).toBe(false);
  });

  it("puts the session user and tokens under `data`, never at the top level", () => {
    // This is the break that stopped the frontend logging in: a flat
    // { accessToken, user } was assumed where the API sends an envelope.
    expect(LOGIN_SUCCESS).not.toHaveProperty("accessToken");
    expect(LOGIN_SUCCESS.data.tokens.accessToken).toBeTypeOf("string");
    expect(LOGIN_SUCCESS.data.user.email).toBe("admin@example.com");
  });

  it("reports expiresIn in seconds", () => {
    // 900 = 15 minutes. If this were milliseconds the cookie maxAge would be
    // wrong by three orders of magnitude.
    expect(LOGIN_SUCCESS.data.tokens.expiresIn).toBe(900);
  });

  it("gives the session user permissions as an array of strings", () => {
    // Without this the frontend's permission gates all fail closed and every
    // page redirects to /forbidden.
    expect(Array.isArray(LOGIN_SUCCESS.data.user.permissions)).toBe(true);
    expect(LOGIN_SUCCESS.data.user.permissions).toContain("USER_VIEW");
  });

  it("gives the user a single `role` string, not a `roles` array", () => {
    expect(LOGIN_SUCCESS.data.user.role).toBe("SUPER_ADMIN");
    expect(LOGIN_SUCCESS.data.user).not.toHaveProperty("roles");
  });
});

describe("paginated envelope", () => {
  it("is recognised by isApiPaginated", () => {
    expect(isApiPaginated(USER_LIST)).toBe(true);
    expect(isApiPaginated(LOGIN_SUCCESS)).toBe(false);
  });

  it("carries all six meta keys", () => {
    expect(Object.keys((USER_LIST as ApiPaginated<unknown>).meta).sort()).toEqual([
      "hasNextPage",
      "hasPreviousPage",
      "page",
      "pageSize",
      "total",
      "totalPages",
    ]);
  });

  it("is one-indexed, so no conversion is needed in adapters", () => {
    expect(USER_LIST.meta.page).toBe(1);
    expect(USER_LIST.meta.hasPreviousPage).toBe(false);
  });
});

// --- Error envelope ---------------------------------------------------------

describe("error envelope", () => {
  it("is flat — no nested `error` object", () => {
    expect(isApiFailure(VALIDATION_FAILURE)).toBe(true);
    expect(VALIDATION_FAILURE).not.toHaveProperty("error");
    expect((VALIDATION_FAILURE as ApiFailure).message).toBeTypeOf("string");
  });

  it("names field errors `field`, not `path`", () => {
    expect(VALIDATION_FAILURE.errors[0]).toEqual({
      field: "pageSize",
      message: "pageSize cannot exceed 100",
    });
  });

  it("omits `errors` on failures that are not validation failures", () => {
    expect("errors" in UNAUTHORIZED).toBe(false);
  });

  it("uses 400 for validation, never 422", async () => {
    const error = await parseApiError(
      new Response(JSON.stringify(VALIDATION_FAILURE), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(error.status).toBe(400);
    expect(error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    // `isValidationError` must treat 400 as form-mappable, or field errors would
    // never reach the inputs.
    expect(error.isValidationError).toBe(true);
    expect(error.hasFieldErrors()).toBe(true);
  });
});

describe("parseApiError against real bodies", () => {
  it("maps a validation failure onto ApiError, translating `field` to `path`", async () => {
    const error = await parseApiError(
      new Response(JSON.stringify(VALIDATION_FAILURE), {
        status: 400,
        headers: { "content-type": "application/json", "x-request-id": "req_abc" },
      }),
    );

    expect(error.errors).toEqual([
      { path: "pageSize", message: "pageSize cannot exceed 100", code: undefined },
    ]);
    // The header wins over the body copy; both are present in practice.
    expect(error.requestId).toBe("req_abc");
  });

  it("reads requestId from the body when the header is absent", async () => {
    const error = await parseApiError(
      new Response(JSON.stringify(UNAUTHORIZED), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );

    expect(error.requestId).toBe("e9148884-76d1-4f30-adf5-591bf6b546d1");
    expect(error.code).toBe(ERROR_CODES.AUTH_TOKEN_MISSING);
    expect(error.isUnauthorized).toBe(true);
  });

  it("treats a 204 delete as a success with no body", async () => {
    // Nothing to parse — this is here so the convention is pinned somewhere.
    const response = new Response(null, { status: 204 });
    expect(response.ok).toBe(true);
    expect(response.status).toBe(204);
  });
});

// --- Auth code behaviour ----------------------------------------------------

describe("terminal auth codes", () => {
  it("treats an expired token as refreshable", () => {
    expect(isTerminalAuthCode(ERROR_CODES.AUTH_TOKEN_EXPIRED)).toBe(false);
    expect(isTerminalAuthCode(ERROR_CODES.AUTH_TOKEN_MISSING)).toBe(false);
  });

  it("treats a revoked session or disabled account as terminal", () => {
    // The backend revokes the whole refresh family when a token is replayed;
    // asking it to refresh again cannot succeed.
    expect(isTerminalAuthCode(ERROR_CODES.AUTH_SESSION_REVOKED)).toBe(true);
    expect(isTerminalAuthCode(ERROR_CODES.AUTH_ACCOUNT_DISABLED)).toBe(true);
  });

  it("ignores an unknown or missing code", () => {
    expect(isTerminalAuthCode(undefined)).toBe(false);
    expect(isTerminalAuthCode("SOMETHING_ELSE")).toBe(false);
  });
});

// --- Constants --------------------------------------------------------------

describe("pagination limits", () => {
  it("matches the backend's hard cap", () => {
    // The API rejects 101 with a 400 rather than clamping, so the frontend
    // clamp must not be looser than this.
    expect(MAX_PAGE_SIZE).toBe(100);
  });
});
