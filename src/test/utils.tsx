import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ConfirmProvider } from "@/components/common/confirm-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Permission } from "@/constants/permissions";
import { AuthProvider } from "@/lib/auth/auth-context";
import type { SessionUser } from "@/types/auth";

/**
 * Test render helper.
 *
 * Wraps the tree in the same providers the app uses, so a component under test
 * behaves exactly as it does in production. `permissions` is the knob most
 * tests reach for — it is what makes "hides the create button without
 * permission" a one-line setup.
 */

export function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: "u1",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    fullName: "Test User",
    status: "ACTIVE",
    avatarUrl: null,
    // Singular: the API models one role per user. Authorization reads
    // `permissions`, never this.
    role: "ADMIN",
    permissions: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Retries turn a deliberate 500 into a multi-second test.
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  permissions?: Permission[];
  user?: SessionUser | null;
  queryClient?: QueryClient;
}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { permissions = [], user, queryClient, ...options }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const client = queryClient ?? makeTestQueryClient();

  const resolvedUser =
    user === null ? null : (user ?? makeUser({ permissions: permissions as string[] }));

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <AuthProvider initialUser={resolvedUser} initialAccessToken="test-token">
          {/* Mirrors the provider stack in `src/components/providers.tsx`. */}
          <TooltipProvider delayDuration={300}>
            <ConfirmProvider>{children}</ConfirmProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient: client };
}
