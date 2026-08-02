"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { makeQueryClient } from "./query-client";

/**
 * Holds the QueryClient for the browser tree.
 *
 * `useState(makeQueryClient)` rather than a module singleton: React may render
 * this twice in development Strict Mode, and a lazily-initialised state value
 * guarantees exactly one client per mounted tree.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
