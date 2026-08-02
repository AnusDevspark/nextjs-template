"use client";

import { useCallback } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";

import { clientApi } from "@/lib/api";
import type { BaseListQuery } from "@/lib/query/list-query";
import { createQueryKeys } from "@/lib/query/query-keys";

import type { ResourceDefinition, ResourceId, ResourceListResult } from "./resource.types";

/**
 * Data hooks for a resource.
 *
 * Thin wrappers over TanStack Query. Their value is consistency: every resource
 * gets the same keys, the same invalidation on mutation, the same abort-signal
 * plumbing — so a feature never writes cache-management code, and a stale table
 * after a delete stops being a recurring bug.
 */

type Resource<TEntity, TCreate, TUpdate, TQuery extends BaseListQuery> = ResourceDefinition<
  TEntity,
  TCreate,
  TUpdate,
  TQuery,
  // The form value type is irrelevant to data fetching.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any
>;

export function resourceKeys(resourceKey: string) {
  return createQueryKeys(resourceKey);
}

/** One page of a resource list. */
export function useResourceList<TEntity, TCreate, TUpdate, TQuery extends BaseListQuery>(
  resource: Resource<TEntity, TCreate, TUpdate, TQuery>,
  query: TQuery,
  options: { enabled?: boolean } = {},
): UseQueryResult<ResourceListResult<TEntity>> {
  const keys = createQueryKeys(resource.key);

  return useQuery({
    queryKey: keys.list(query),
    queryFn: ({ signal }) => resource.api.list(query, { client: clientApi, signal }),
    enabled: options.enabled ?? true,
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: (previous) => previous,
  });
}

/** A single record. Disabled automatically when `id` is missing. */
export function useResourceDetail<TEntity, TCreate, TUpdate, TQuery extends BaseListQuery>(
  resource: Resource<TEntity, TCreate, TUpdate, TQuery>,
  id: ResourceId | undefined,
  options: { enabled?: boolean } = {},
): UseQueryResult<TEntity> {
  const keys = createQueryKeys(resource.key);

  return useQuery({
    queryKey: keys.detail(id ?? ""),
    queryFn: ({ signal }) => resource.api.getById(id!, { client: clientApi, signal }),
    enabled: (options.enabled ?? true) && id !== undefined && id !== "",
  });
}

/**
 * Invalidation helpers.
 *
 * Because keys are prefix-structured, invalidating `lists()` matches every
 * cached page and filter combination at once — there is no list of keys to keep
 * in sync as filters are added.
 */
export function useResourceCache(resourceKey: string) {
  const queryClient = useQueryClient();
  const keys = createQueryKeys(resourceKey);

  const invalidateLists = useCallback(
    () => queryClient.invalidateQueries({ queryKey: keys.lists() }),
    [queryClient, keys],
  );

  const invalidateDetail = useCallback(
    (id: ResourceId) => queryClient.invalidateQueries({ queryKey: keys.detail(id) }),
    [queryClient, keys],
  );

  const invalidateAll = useCallback(
    () => queryClient.invalidateQueries({ queryKey: keys.all }),
    [queryClient, keys],
  );

  const removeDetail = useCallback(
    (id: ResourceId) => queryClient.removeQueries({ queryKey: keys.detail(id) }),
    [queryClient, keys],
  );

  return { keys, invalidateLists, invalidateDetail, invalidateAll, removeDetail };
}

export function useCreateResource<TEntity, TCreate, TUpdate, TQuery extends BaseListQuery>(
  resource: Resource<TEntity, TCreate, TUpdate, TQuery>,
): UseMutationResult<TEntity, unknown, TCreate> {
  const { invalidateLists } = useResourceCache(resource.key);

  return useMutation({
    mutationFn: (data: TCreate) => {
      if (!resource.api.create) {
        throw new Error(`Resource "${resource.key}" does not support create.`);
      }
      return resource.api.create(data, { client: clientApi });
    },
    // A new record can appear on any page under any filter, so every list is
    // now potentially stale.
    onSuccess: () => invalidateLists(),
  });
}

export function useUpdateResource<TEntity, TCreate, TUpdate, TQuery extends BaseListQuery>(
  resource: Resource<TEntity, TCreate, TUpdate, TQuery>,
): UseMutationResult<TEntity, unknown, { id: ResourceId; data: TUpdate }> {
  const queryClient = useQueryClient();
  const { keys, invalidateLists } = useResourceCache(resource.key);

  return useMutation({
    mutationFn: ({ id, data }: { id: ResourceId; data: TUpdate }) => {
      if (!resource.api.update) {
        throw new Error(`Resource "${resource.key}" does not support update.`);
      }
      return resource.api.update(id, data, { client: clientApi });
    },
    onSuccess: (entity, { id }) => {
      // Seed the detail cache with the server's response so navigating back to
      // the record shows the saved values immediately.
      queryClient.setQueryData(keys.detail(id), entity);
      void invalidateLists();
    },
  });
}

export function useDeleteResource<TEntity, TCreate, TUpdate, TQuery extends BaseListQuery>(
  resource: Resource<TEntity, TCreate, TUpdate, TQuery>,
): UseMutationResult<void, unknown, ResourceId> {
  const { invalidateLists, removeDetail } = useResourceCache(resource.key);

  return useMutation({
    mutationFn: (id: ResourceId) => {
      if (!resource.api.remove) {
        throw new Error(`Resource "${resource.key}" does not support delete.`);
      }
      return resource.api.remove(id, { client: clientApi });
    },
    onSuccess: (_result, id) => {
      // Drop the detail entry outright — refetching a deleted record would 404.
      removeDetail(id);
      void invalidateLists();
    },
  });
}
