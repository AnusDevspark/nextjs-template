import { createResourceApi, toListResult, toQueryParams } from "@/framework/resource";

import type { Department, DepartmentInput, DepartmentListQuery } from "./department.types";

/**
 * Department API adapter.
 *
 * A third envelope shape, and the friendliest of the three:
 *
 *   { "items": [...], "pagination": { "total": 20 } }
 *
 * No DTO mapper here — the response already matches the view model, so adding
 * one would be ceremony. Provider and Facility have mappers because their DTOs
 * genuinely differ; consistency is not a reason to write code that does nothing.
 */

interface DepartmentListResponse {
  items: Department[];
  pagination: {
    total: number;
    page?: number;
    pageSize?: number;
  };
}

export const departmentApi = createResourceApi<
  Department,
  DepartmentInput,
  DepartmentInput,
  DepartmentListQuery
>({
  list: async (query, { client, signal }) => {
    const response = await client.get<DepartmentListResponse>("/departments", {
      query: toQueryParams(query),
      signal,
    });

    return toListResult(response.items, {
      page: response.pagination.page ?? query.page,
      pageSize: response.pagination.pageSize ?? query.pageSize,
      total: response.pagination.total,
    });
  },

  getById: (id, { client, signal }) => client.get<Department>(`/departments/${id}`, { signal }),

  create: (data, { client, signal }) => client.post<Department>("/departments", data, { signal }),

  update: (id, data, { client, signal }) =>
    client.put<Department>(`/departments/${id}`, data, { signal }),

  remove: async (id, { client, signal }) => {
    await client.delete(`/departments/${id}`, { signal });
  },
});
