/**
 * Query key factory.
 *
 * Small on purpose. It exists so cache invalidation is predictable — every
 * resource gets the same four-level hierarchy, so "refresh all user lists"
 * is one call rather than a hand-maintained list of keys.
 *
 *   ["user"]                          all user data
 *   ["user", "list"]                  every list, any query
 *   ["user", "list", { page: 1 }]     one specific list
 *   ["user", "detail"]                every detail
 *   ["user", "detail", "abc"]         one record
 *
 * Because the levels are prefixes, `invalidateQueries({ queryKey: keys.lists() })`
 * matches every cached page and filter combination at once.
 */
export function createQueryKeys(resourceKey: string) {
  return {
    all: [resourceKey] as const,

    lists: () => [resourceKey, "list"] as const,
    /** `query` is serialized structurally by TanStack Query, so object key order does not matter. */
    list: (query: unknown) => [resourceKey, "list", query] as const,

    details: () => [resourceKey, "detail"] as const,
    detail: (id: string | number) => [resourceKey, "detail", String(id)] as const,

    /** For anything that is neither a list nor a record, e.g. `["user", "stats"]`. */
    scope: (...segments: readonly (string | number)[]) => [resourceKey, ...segments] as const,
  };
}

export type QueryKeys = ReturnType<typeof createQueryKeys>;

/** Keys for data that is not resource-shaped. */
export const appKeys = {
  session: ["session"] as const,
} as const;
