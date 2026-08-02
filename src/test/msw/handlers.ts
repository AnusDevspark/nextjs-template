import { http, HttpResponse } from "msw";

import type { Provider } from "@/features/provider";

/**
 * Default MSW handlers.
 *
 * These exist for tests only — the app itself always talks to the real Node
 * API. They reproduce the *envelope* each backend actually uses, so the adapter
 * tests prove the real normalization logic rather than a convenient fiction.
 */

export const API_URL = "http://localhost:4000/api/v1";

export function makeProvider(overrides: Partial<Provider> = {}): Provider {
  return {
    id: "p1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "5551234567",
    npi: "1234567890",
    specialty: "CARDIOLOGY",
    credentials: ["MD"],
    status: "ACTIVE",
    facilityId: "f1",
    facilityName: "Central Hospital",
    acceptingNewPatients: true,
    startDate: "2024-03-01",
    notes: null,
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-06-01T10:00:00.000Z",
    ...overrides,
  };
}

/** The Provider service's double envelope, as a raw DTO list. */
export function providerListEnvelope(providers: Provider[], total = providers.length) {
  return {
    responseData: {
      message: {
        items: providers.map((provider) => ({
          ...provider,
          credentials: provider.credentials.join(","),
          facility: provider.facilityId
            ? { id: provider.facilityId, name: provider.facilityName }
            : null,
        })),
        total,
      },
    },
  };
}

export function providerDetailEnvelope(provider: Provider) {
  return {
    responseData: {
      message: {
        ...provider,
        credentials: provider.credentials.join(","),
        facility: provider.facilityId
          ? { id: provider.facilityId, name: provider.facilityName }
          : null,
      },
    },
  };
}

export const handlers = [
  http.get("/api/auth/session", () => HttpResponse.json({ user: null, accessToken: null })),

  http.get(`${API_URL}/providers`, () =>
    HttpResponse.json(providerListEnvelope([makeProvider()], 1)),
  ),

  http.get(`${API_URL}/providers/:id`, ({ params }) =>
    HttpResponse.json(providerDetailEnvelope(makeProvider({ id: String(params.id) }))),
  ),
];
