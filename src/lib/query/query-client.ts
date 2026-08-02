import { QueryClient, type DefaultOptions } from "@tanstack/react-query";

import { isApiError } from "@/lib/errors";

/**
 * Shared TanStack Query defaults.
 *
 * The important choice is retry behaviour: retrying a 403 or a 422 wastes three
 * round trips and delays the error the user needs to see. Only genuinely
 * transient failures (network, 429, 5xx) are worth another attempt.
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Admin data changes often enough that a long stale time causes confusion
    // after a mutation, but 30s stops a tab switch from refetching everything.
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (isApiError(error) && !error.isRetryable) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
  },
  mutations: {
    // Never retry a mutation automatically — a retried POST can create two
    // records. The user decides whether to resubmit.
    retry: false,
  },
};

export function makeQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions });
}

/**
 * On the server, every request needs its own client so one user's data cannot
 * be served to another. In the browser the client is a singleton, otherwise a
 * re-render would discard the whole cache.
 */
let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
