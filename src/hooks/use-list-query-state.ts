"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  countActiveFilters,
  getActiveFilters,
  parseListQuery,
  serializeListQuery,
  type ListFilters,
  type ListQuery,
  type ListQueryConfig,
  type SortOrder,
} from "@/lib/query/list-query";

export interface ListQueryState {
  query: ListQuery;
  filters: ListFilters;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  /** True while a navigation triggered by one of the setters is in flight. */
  isPending: boolean;

  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSort: (field: string, order: SortOrder) => void;
  toggleSort: (field: string) => void;
  clearSort: () => void;
  setFilter: (key: string, value: string | string[] | undefined) => void;
  setFilters: (next: ListFilters) => void;
  clearFilters: () => void;
  reset: () => void;
}

/**
 * Keeps list state — page, size, search, sort, filters — in the URL.
 *
 * The URL is the single source of truth, which is what makes a filtered table
 * refresh-safe, shareable and navigable with the back button. There is no
 * parallel `useState` copy to drift out of sync.
 *
 * Updates use `router.replace` with `scroll: false`: paging through a table
 * should not add fifty history entries or jump the viewport to the top.
 */
export function useListQueryState(config: ListQueryConfig = {}): ListQueryState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // `config` is usually an inline object literal, so depend on its contents
  // rather than its identity to avoid re-parsing on every render.
  const configKey = JSON.stringify(config);

  const query = useMemo(
    () => parseListQuery(new URLSearchParams(searchParams.toString()), config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, configKey],
  );

  const push = useCallback(
    (next: ListQuery) => {
      const params = serializeListQuery(next, config);
      const search = params.toString();

      startTransition(() => {
        router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, pathname, configKey],
  );

  const setPage = useCallback((page: number) => push({ ...query, page }), [push, query]);

  const setPageSize = useCallback(
    // Changing page size invalidates the current offset; go back to page 1.
    (pageSize: number) => push({ ...query, pageSize, page: 1 }),
    [push, query],
  );

  const setSearch = useCallback(
    (search: string) => push({ ...query, search: search.trim() || undefined, page: 1 }),
    [push, query],
  );

  const setSort = useCallback(
    (field: string, order: SortOrder) => push({ ...query, sortBy: field, sortOrder: order }),
    [push, query],
  );

  /** asc → desc → cleared, matching the three-state header control. */
  const toggleSort = useCallback(
    (field: string) => {
      if (query.sortBy !== field) {
        push({ ...query, sortBy: field, sortOrder: "asc" });
        return;
      }
      if (query.sortOrder === "asc") {
        push({ ...query, sortBy: field, sortOrder: "desc" });
        return;
      }
      push({ ...query, sortBy: undefined, sortOrder: undefined });
    },
    [push, query],
  );

  const clearSort = useCallback(
    () => push({ ...query, sortBy: undefined, sortOrder: undefined }),
    [push, query],
  );

  const setFilter = useCallback(
    (key: string, value: string | string[] | undefined) => {
      const next: ListQuery = { ...query, page: 1 };
      const isEmpty =
        value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        delete next[key];
      } else {
        next[key] = value;
      }

      push(next);
    },
    [push, query],
  );

  const setFilters = useCallback(
    (nextFilters: ListFilters) => {
      const next: ListQuery = {
        page: 1,
        pageSize: query.pageSize,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      for (const [key, value] of Object.entries(nextFilters)) {
        const isEmpty =
          value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
        if (!isEmpty) next[key] = value;
      }

      push(next);
    },
    [push, query],
  );

  const clearFilters = useCallback(
    () =>
      push({
        page: 1,
        pageSize: query.pageSize,
        search: undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
    [push, query],
  );

  const reset = useCallback(() => {
    startTransition(() => router.replace(pathname, { scroll: false }));
  }, [router, pathname]);

  const filters = useMemo(() => getActiveFilters(query), [query]);
  const activeFilterCount = useMemo(() => countActiveFilters(query), [query]);

  return {
    query,
    filters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    isPending,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    toggleSort,
    clearSort,
    setFilter,
    setFilters,
    clearFilters,
    reset,
  };
}
