import { createResourceApi, toListResult, toQueryParams } from "@/framework/resource";
import type { ApiPaginated, ApiSuccess } from "@/lib/api/contract";

import type { CreateUserInput, UpdateUserInput, User, UserListQuery } from "./user.types";

/**
 * User API adapter — the only file in this feature that knows the wire format.
 *
 * The API wraps every response in `{ success, message?, data }`, and list
 * responses add `meta`. Those envelope types are mirrored once in
 * `@/lib/api/contract` rather than redeclared per feature, because unlike a
 * per-backend quirk they are the same for every endpoint here.
 *
 * Two things worth copying when you add your own module:
 *
 *   - `toQueryParams(query)` has no rename map. The API already speaks
 *     page/pageSize/search/sortBy/sortOrder, and pagination is one-indexed on
 *     both sides. A backend that disagrees gets its rename map here and nowhere
 *     else.
 *   - Update is PATCH. The API has no PUT routes at all; a PUT is a 404.
 */

export const userApi = createResourceApi<User, CreateUserInput, UpdateUserInput, UserListQuery>({
  list: async (query, { client, signal }) => {
    const response = await client.get<ApiPaginated<User>>("/users", {
      query: toQueryParams(query),
      signal,
    });

    return toListResult(response.data, {
      page: response.meta.page,
      pageSize: response.meta.pageSize,
      total: response.meta.total,
      totalPages: response.meta.totalPages,
    });
  },

  getById: async (id, { client, signal }) => {
    const response = await client.get<ApiSuccess<User>>(`/users/${id}`, { signal });
    return response.data;
  },

  create: async (data, { client, signal }) => {
    const response = await client.post<ApiSuccess<User>>("/users", data, { signal });
    return response.data;
  },

  update: async (id, data, { client, signal }) => {
    const response = await client.patch<ApiSuccess<User>>(`/users/${id}`, data, { signal });
    return response.data;
  },

  remove: async (id, { client, signal }) => {
    // 204, no body. `readJson` returns undefined rather than throwing.
    await client.delete(`/users/${id}`, { signal });
  },
});
