import { http, HttpResponse } from "msw";

import type { User } from "@/features/user";
import type { ApiPaginated, ApiSuccess, PaginationMeta } from "@/lib/api/contract";

/**
 * Default MSW handlers.
 *
 * These exist for tests only — the app itself always talks to the real Node
 * API. They reproduce the *exact* envelope the backend sends, so adapter tests
 * prove the real normalization logic rather than a convenient fiction. If you
 * change a shape here and the tests still pass, the shape was not being
 * asserted; see `src/lib/api/contract.test.ts`.
 */

export const API_URL = "http://localhost:4000/api/v1";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Ada",
    lastName: "Lovelace",
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    status: "ACTIVE",
    role: "ADMIN",
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...overrides,
  };
}

/** `{ success, data, meta }` — the list envelope, with all six meta keys. */
export function paginatedEnvelope<T>(
  items: T[],
  meta: Partial<PaginationMeta> = {},
): ApiPaginated<T> {
  const page = meta.page ?? 1;
  const pageSize = meta.pageSize ?? 20;
  const total = meta.total ?? items.length;
  const totalPages = meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  return {
    success: true,
    data: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: meta.hasNextPage ?? page < totalPages,
      hasPreviousPage: meta.hasPreviousPage ?? page > 1,
    },
  };
}

/**
 * `{ success, data }` — the single-resource envelope.
 *
 * `message` is omitted rather than set to null, which is what the API does when
 * an endpoint has nothing to say.
 */
export function successEnvelope<T>(data: T, message?: string): ApiSuccess<T> {
  return message === undefined ? { success: true, data } : { success: true, message, data };
}

export const handlers = [
  http.get("/api/auth/session", () => HttpResponse.json({ user: null, accessToken: null })),

  http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope([makeUser()]))),

  http.get(`${API_URL}/users/:id`, ({ params }) =>
    HttpResponse.json(successEnvelope(makeUser({ id: String(params.id) }))),
  ),
];
