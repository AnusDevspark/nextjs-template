import { createResourceApi, toListResult, toQueryParams } from "@/framework/resource";

import type {
  CreateProviderInput,
  Provider,
  ProviderListQuery,
  UpdateProviderInput,
} from "./provider.types";

/**
 * Provider API adapter.
 *
 * The Provider endpoints wrap everything in a double envelope:
 *
 *   { "responseData": { "message": { "items": [...], "total": 20 } } }
 *
 * That shape stops here. Everything above this file — the table, pagination,
 * the detail page — sees `ResourceListResult`. When the backend changes its
 * envelope, this file changes and nothing else does.
 *
 * The module is deliberately *not* marked `"use client"`: it takes its
 * `ApiClient` as an argument, so the same adapter runs in a browser hook
 * (`clientApi`) and in a Server Component (`serverApi`) for prefetching.
 */

/** The raw list envelope, as the backend actually sends it. */
interface ProviderListEnvelope {
  responseData: {
    message: {
      items: ProviderDto[];
      total: number;
      page?: number;
      pageSize?: number;
    };
  };
}

interface ProviderDetailEnvelope {
  responseData: {
    message: ProviderDto;
  };
}

/**
 * The wire shape. It differs from the UI model in two ways worth mapping:
 * `credentials` arrives as a comma-separated string, and the facility name is
 * nested inside a relation object.
 */
interface ProviderDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  npi: string;
  specialty: string;
  credentials: string | string[] | null;
  status: string;
  facility: { id: string; name: string } | null;
  acceptingNewPatients: boolean;
  startDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO → view model.
 *
 * Exists because the DTO is genuinely inconvenient here. Where a DTO already
 * matches what the UI needs — see Department — no mapper is written.
 */
function toProvider(dto: ProviderDto): Provider {
  return {
    id: dto.id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone,
    npi: dto.npi,
    specialty: dto.specialty as Provider["specialty"],
    credentials: Array.isArray(dto.credentials)
      ? dto.credentials
      : (dto.credentials
          ?.split(",")
          .map((entry) => entry.trim())
          .filter(Boolean) ?? []),
    status: dto.status as Provider["status"],
    facilityId: dto.facility?.id ?? null,
    facilityName: dto.facility?.name ?? null,
    acceptingNewPatients: dto.acceptingNewPatients,
    startDate: dto.startDate,
    notes: dto.notes,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const providerApi = createResourceApi<
  Provider,
  CreateProviderInput,
  UpdateProviderInput,
  ProviderListQuery
>({
  list: async (query, { client, signal }) => {
    const response = await client.get<ProviderListEnvelope>("/providers", {
      // The backend calls it `q`, not `search`; the rename lives here rather
      // than leaking a backend vocabulary into the URL the user sees.
      query: toQueryParams(query, { search: "q" }),
      signal,
    });

    const payload = response.responseData.message;

    return toListResult(payload.items.map(toProvider), {
      page: payload.page ?? query.page,
      pageSize: payload.pageSize ?? query.pageSize,
      total: payload.total,
    });
  },

  getById: async (id, { client, signal }) => {
    const response = await client.get<ProviderDetailEnvelope>(`/providers/${id}`, { signal });
    return toProvider(response.responseData.message);
  },

  create: async (data, { client, signal }) => {
    const response = await client.post<ProviderDetailEnvelope>("/providers", data, { signal });
    return toProvider(response.responseData.message);
  },

  update: async (id, data, { client, signal }) => {
    const response = await client.patch<ProviderDetailEnvelope>(`/providers/${id}`, data, {
      signal,
    });
    return toProvider(response.responseData.message);
  },

  remove: async (id, { client, signal }) => {
    await client.delete(`/providers/${id}`, { signal });
  },

  /** Powers `ProviderSelect` elsewhere in the app. */
  lookup: async ({ search, page }, { client, signal }) => {
    const response = await client.get<ProviderListEnvelope>("/providers", {
      query: { q: search, page, pageSize: 20, status: "ACTIVE" },
      signal,
    });

    const payload = response.responseData.message;

    return {
      items: payload.items.map((dto) => ({
        value: dto.id,
        label: `${dto.firstName} ${dto.lastName}`,
        description: dto.specialty,
      })),
      hasMore: page * 20 < payload.total,
    };
  },

  lookupOne: async (id, { client, signal }) => {
    const response = await client.get<ProviderDetailEnvelope>(`/providers/${id}`, { signal });
    const dto = response.responseData.message;

    return { value: dto.id, label: `${dto.firstName} ${dto.lastName}`, description: dto.specialty };
  },
});

/**
 * A non-CRUD business operation.
 *
 * Deliberately not forced into the `ResourceApi` contract — that contract is
 * about CRUD. Business actions are ordinary exported functions, and the
 * resource's `actions.custom` calls them.
 */
export async function deactivateProvider(
  id: string,
  reason: string,
  client: Parameters<typeof providerApi.getById>[1]["client"],
): Promise<void> {
  await client.post(`/providers/${id}/deactivate`, { reason });
}
