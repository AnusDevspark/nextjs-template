import { createResourceApi, toListResult, toQueryParams } from "@/framework/resource";

import {
  formatAddress,
  type CreateFacilityInput,
  type Facility,
  type FacilityListQuery,
  type UpdateFacilityInput,
} from "./facility.types";

/**
 * Facility API adapter.
 *
 * The Facility service is a different backend team's work and returns a
 * Spring-style envelope:
 *
 *   { "data": { "content": [...], "totalElements": 20, "number": 0, "size": 20 } }
 *
 * Two mismatches are handled here and nowhere else:
 *
 *   1. `content` / `totalElements` instead of `items` / `total`.
 *   2. Pages are **zero-indexed** upstream, one-indexed in the UI and the URL.
 *      Getting this wrong shows page 2 when the user asked for page 1, so the
 *      conversion is done once, at the boundary.
 *
 * The table, pagination and detail page see exactly the same normalized shape
 * they get from Provider. That is the point of the adapter layer.
 */

interface SpringPage<T> {
  data: {
    content: T[];
    totalElements: number;
    /** Zero-indexed. */
    number: number;
    size: number;
    totalPages: number;
  };
}

interface FacilityDto {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  email: string | null;
  bedCount: number | null;
  departmentCount: number | null;
  providerCount: number | null;
  openedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO → view model.
 *
 * The backend stores the address flat; the UI works with it as a nested object
 * because that is how the form groups it and how the detail page renders it.
 */
function toFacility(dto: FacilityDto): Facility {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    type: dto.type as Facility["type"],
    status: dto.status as Facility["status"],
    address: {
      line1: dto.addressLine1,
      line2: dto.addressLine2,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
    },
    phone: dto.phone,
    email: dto.email,
    bedCount: dto.bedCount,
    departmentCount: dto.departmentCount ?? 0,
    providerCount: dto.providerCount ?? 0,
    openedOn: dto.openedOn,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** View model → DTO, flattening the address again on the way out. */
function toFacilityDto(input: CreateFacilityInput | UpdateFacilityInput) {
  const { address, ...rest } = input;

  return {
    ...rest,
    ...(address
      ? {
          addressLine1: address.line1,
          addressLine2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        }
      : {}),
  };
}

export const facilityApi = createResourceApi<
  Facility,
  CreateFacilityInput,
  UpdateFacilityInput,
  FacilityListQuery
>({
  list: async (query, { client, signal }) => {
    const response = await client.get<SpringPage<FacilityDto>>("/facilities", {
      query: {
        ...toQueryParams(query, { pageSize: "size", search: "keyword" }),
        // Zero-indexed upstream.
        page: query.page - 1,
      },
      signal,
    });

    const payload = response.data;

    return toListResult(payload.content.map(toFacility), {
      // Back to one-indexed for the UI.
      page: payload.number + 1,
      pageSize: payload.size,
      total: payload.totalElements,
      totalPages: payload.totalPages,
    });
  },

  getById: async (id, { client, signal }) => {
    const response = await client.get<{ data: FacilityDto }>(`/facilities/${id}`, { signal });
    return toFacility(response.data);
  },

  create: async (data, { client, signal }) => {
    const response = await client.post<{ data: FacilityDto }>("/facilities", toFacilityDto(data), {
      signal,
    });
    return toFacility(response.data);
  },

  update: async (id, data, { client, signal }) => {
    const response = await client.put<{ data: FacilityDto }>(
      `/facilities/${id}`,
      toFacilityDto(data),
      { signal },
    );
    return toFacility(response.data);
  },

  remove: async (id, { client, signal }) => {
    await client.delete(`/facilities/${id}`, { signal });
  },

  lookup: async ({ search, page }, { client, signal }) => {
    const response = await client.get<SpringPage<FacilityDto>>("/facilities", {
      query: { keyword: search, page: page - 1, size: 20 },
      signal,
    });

    const payload = response.data;

    return {
      items: payload.content.map((dto) => ({
        value: dto.id,
        label: dto.name,
        description: `${dto.city}, ${dto.state}`,
      })),
      hasMore: payload.number + 1 < payload.totalPages,
    };
  },

  lookupOne: async (id, { client, signal }) => {
    const response = await client.get<{ data: FacilityDto }>(`/facilities/${id}`, { signal });
    const facility = toFacility(response.data);

    return {
      value: facility.id,
      label: facility.name,
      description: formatAddress(facility.address),
    };
  },
});

/** Distinct states, for the custom state filter. */
export async function fetchFacilityStates(
  client: Parameters<typeof facilityApi.getById>[1]["client"],
  signal?: AbortSignal,
): Promise<string[]> {
  const response = await client.get<{ data: string[] }>("/facilities/states", { signal });
  return response.data;
}
