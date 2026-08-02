import type { QueryParams } from "@/lib/api";
import type { BaseListQuery } from "@/lib/query/list-query";

import type { PageMeta, ResourceListResult } from "./resource.types";

/**
 * Helpers for writing resource API adapters.
 *
 * The adapter is the *only* place a backend's response shape is allowed to
 * exist. Everything above it — the table, pagination, the detail page — sees
 * `ResourceListResult`. These helpers exist so the tedious part of that
 * translation (computing `totalPages`, defaulting a missing `total`) is not
 * retyped per module.
 */

export interface BuildPageMetaInput {
  page: number;
  pageSize: number;
  total: number;
  /** Supply when the backend sends it; otherwise it is derived. */
  totalPages?: number;
}

export function buildPageMeta({ page, pageSize, total, totalPages }: BuildPageMetaInput): PageMeta {
  const safePageSize = pageSize > 0 ? pageSize : 20;
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;

  return {
    page: page > 0 ? page : 1,
    pageSize: safePageSize,
    total: safeTotal,
    totalPages: totalPages ?? Math.max(1, Math.ceil(safeTotal / safePageSize)),
  };
}

/**
 * Assembles a normalized list result.
 *
 *   return toListResult(response.responseData.message.items, {
 *     page: query.page,
 *     pageSize: query.pageSize,
 *     total: response.responseData.message.total,
 *   });
 */
export function toListResult<TEntity>(
  items: TEntity[] | null | undefined,
  meta: BuildPageMetaInput,
): ResourceListResult<TEntity> {
  return { items: items ?? [], meta: buildPageMeta(meta) };
}

/**
 * A result for a backend that returns no total.
 *
 * Reports `total` as everything seen so far, plus one more page when the
 * current page came back full. Pagination stays usable; the count is honest
 * about being a lower bound.
 */
export function toUnknownTotalResult<TEntity>(
  items: TEntity[],
  query: Pick<BaseListQuery, "page" | "pageSize">,
): ResourceListResult<TEntity> {
  const seen = (query.page - 1) * query.pageSize + items.length;
  const hasMore = items.length === query.pageSize;

  return {
    items,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total: hasMore ? seen + 1 : seen,
      totalPages: hasMore ? query.page + 1 : query.page,
    },
  };
}

export function emptyListResult<TEntity>(
  query: Pick<BaseListQuery, "page" | "pageSize">,
): ResourceListResult<TEntity> {
  return {
    items: [],
    meta: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 1 },
  };
}

/**
 * Converts a list query into request params, renaming keys where the backend
 * disagrees with the frontend's vocabulary.
 *
 *   toQueryParams(query, { page: "pageNumber", pageSize: "size", search: "q" })
 *
 * Filter keys pass through unchanged unless named in `rename`.
 */
export function toQueryParams<TQuery extends object>(
  query: TQuery,
  rename: Record<string, string> = {},
): QueryParams {
  const params: QueryParams = {};

  // Generic over the query type so a feature's `BaseListQuery & { status?: … }`
  // is accepted without needing an index signature it has no other use for.
  for (const [key, value] of Object.entries(query as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;

    params[rename[key] ?? key] = value as QueryParams[string];
  }

  return params;
}

/**
 * Reads the first present key from an object.
 *
 * Useful when one backend calls it `total`, another `totalElements` and a third
 * `count`, and you would rather not write three chained `??`.
 */
export function pick<T>(source: unknown, keys: string[], fallback: T): T {
  if (typeof source !== "object" || source === null) return fallback;

  const record = source as Record<string, unknown>;

  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value as T;
  }

  return fallback;
}
