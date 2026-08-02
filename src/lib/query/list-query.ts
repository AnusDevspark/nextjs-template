export type SortOrder = "asc" | "desc";

/**
 * The query shape every list endpoint understands.
 *
 * Features extend it rather than redefining it:
 *
 *   type ProviderListQuery = BaseListQuery & { status?: string; specialty?: string };
 */
export interface BaseListQuery {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

/** Arbitrary filter values carried alongside the base query. */
export type ListFilters = Record<string, string | string[] | undefined>;

/**
 * A base query plus any number of filter entries.
 *
 * The index signature has to admit `number` so `page`/`pageSize` satisfy it —
 * an interface's declared members must conform to its own index signature.
 */
export interface ListQuery extends BaseListQuery {
  [key: string]: string | string[] | number | undefined;
}

export interface ListQueryConfig {
  defaultPageSize?: number;
  defaultSort?: { field: string; order: SortOrder };
  /** Filter keys read from the URL. Anything else is ignored. */
  filterKeys?: readonly string[];
  /** Keys whose value is a list, e.g. `status=A&status=B`. */
  multiValueKeys?: readonly string[];
}

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Reserved names, so a filter cannot accidentally shadow pagination. */
export const RESERVED_QUERY_KEYS = ["page", "pageSize", "search", "sortBy", "sortOrder"] as const;

type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(params: SearchParamsInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;

  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function readAllParams(params: SearchParamsInput, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key);

  const value = params[key];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Reads a list query out of URL search params.
 *
 * Runs unchanged on the server (`page.tsx` receiving `searchParams`) and in the
 * browser (`useSearchParams`), so a prefetch and the client query that hydrates
 * it produce the identical object — and therefore the identical cache key.
 *
 * Every value is clamped: `?page=-5&pageSize=99999` must not reach the backend.
 */
export function parseListQuery(params: SearchParamsInput, config: ListQueryConfig = {}): ListQuery {
  const {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    defaultSort,
    filterKeys = [],
    multiValueKeys = [],
  } = config;

  const page = clampInt(readParam(params, "page"), 1, 1, 100_000);
  const pageSize = clampInt(readParam(params, "pageSize"), defaultPageSize, 1, 200);

  const search = readParam(params, "search")?.trim() || undefined;

  const sortBy = readParam(params, "sortBy") ?? defaultSort?.field;
  const rawOrder = readParam(params, "sortOrder");
  const sortOrder: SortOrder | undefined = sortBy
    ? rawOrder === "asc" || rawOrder === "desc"
      ? rawOrder
      : (defaultSort?.order ?? "desc")
    : undefined;

  const query: ListQuery = { page, pageSize, search, sortBy, sortOrder };

  for (const key of filterKeys) {
    if ((RESERVED_QUERY_KEYS as readonly string[]).includes(key)) continue;

    if (multiValueKeys.includes(key)) {
      const values = readAllParams(params, key).filter(Boolean);
      if (values.length > 0) query[key] = values;
      continue;
    }

    const value = readParam(params, key)?.trim();
    if (value) query[key] = value;
  }

  return query;
}

/** Serializes a list query back to `URLSearchParams`, dropping defaults. */
export function serializeListQuery(
  query: ListQuery,
  config: ListQueryConfig = {},
): URLSearchParams {
  const { defaultPageSize = DEFAULT_PAGE_SIZE, defaultSort } = config;
  const params = new URLSearchParams();

  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== defaultPageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);

  // Omit the sort when it matches the default: a clean URL is easier to share.
  const isDefaultSort =
    defaultSort && query.sortBy === defaultSort.field && query.sortOrder === defaultSort.order;

  if (query.sortBy && !isDefaultSort) {
    params.set("sortBy", query.sortBy);
    if (query.sortOrder) params.set("sortOrder", query.sortOrder);
  }

  for (const [key, value] of Object.entries(query)) {
    if ((RESERVED_QUERY_KEYS as readonly string[]).includes(key)) continue;
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry);
    } else {
      params.set(key, String(value));
    }
  }

  return params;
}

/** The filter portion of a query — everything that is not pagination or sort. */
export function getActiveFilters(query: ListQuery): ListFilters {
  const filters: ListFilters = {};

  for (const [key, value] of Object.entries(query)) {
    if ((RESERVED_QUERY_KEYS as readonly string[]).includes(key)) continue;
    if (value === undefined || (Array.isArray(value) && value.length === 0)) continue;

    filters[key] = value as string | string[];
  }

  return filters;
}

export function countActiveFilters(query: ListQuery): number {
  return Object.keys(getActiveFilters(query)).length + (query.search ? 1 : 0);
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return fallback;

  return Math.min(Math.max(parsed, min), max);
}
