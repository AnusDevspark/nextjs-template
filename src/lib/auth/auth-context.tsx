"use client";

import { createContext, use, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Permission } from "@/constants/permissions";
import { setAccessToken, setSessionExpiredHandler } from "@/lib/api/client-api";
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  toPermissionSet,
  type PermissionSet,
} from "@/lib/permissions/permissions";
import { appKeys } from "@/lib/query/query-keys";
import type { SessionUser } from "@/types/auth";

interface SessionPayload {
  user: SessionUser | null;
  accessToken: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  permissions: PermissionSet;
  isAuthenticated: boolean;
  isLoading: boolean;
  can: (required: Permission | Permission[] | undefined | null) => boolean;
  canAny: (required: Permission[]) => boolean;
  canAll: (required: Permission[]) => boolean;
  logout: () => void;
  isLoggingOut: boolean;
  refresh: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /**
   * Session read on the server during the initial render. Seeding it here means
   * the first paint already knows who the user is, so permission-gated UI does
   * not flicker in and out.
   */
  initialUser: SessionUser | null;
  /** Only populated in `direct` mode, where the browser attaches it itself. */
  initialAccessToken?: string | null;
}

export function AuthProvider({ children, initialUser, initialAccessToken }: AuthProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Set before first render so a query firing during mount already has a token.
  if (typeof window !== "undefined" && initialAccessToken) {
    setAccessToken(initialAccessToken);
  }

  const { data, isPending, refetch } = useQuery({
    queryKey: appKeys.session,
    queryFn: async (): Promise<SessionPayload> => {
      const response = await fetch("/api/auth/session", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return { user: null, accessToken: null };
      return (await response.json()) as SessionPayload;
    },
    initialData: { user: initialUser, accessToken: initialAccessToken ?? null },
    // The server already gave us a valid session; don't immediately refetch it.
    staleTime: 60_000,
    retry: false,
  });

  const user = data?.user ?? null;

  useEffect(() => {
    setAccessToken(data?.accessToken ?? null);
  }, [data?.accessToken]);

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    },
    onSettled: () => {
      setAccessToken(null);
      // Drop every cached query: the next user of this browser must not see
      // the previous user's rows.
      queryClient.clear();
      router.replace("/login");
      router.refresh();
    },
  });

  /**
   * When a refresh definitively fails, `clientApi` calls this. Sending the user
   * to `/login` from one place keeps every hook free of 401 handling.
   */
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.clear();
      router.replace("/login?expired=1");
    });

    return () => setSessionExpiredHandler(null);
  }, [queryClient, router]);

  const permissions = useMemo(() => toPermissionSet(user?.permissions), [user?.permissions]);

  const can = useCallback(
    (required: Permission | Permission[] | undefined | null) =>
      Array.isArray(required)
        ? hasAllPermissions(permissions, required)
        : hasPermission(permissions, required),
    [permissions],
  );

  const canAny = useCallback(
    (required: Permission[]) => hasAnyPermission(permissions, required),
    [permissions],
  );

  const canAll = useCallback(
    (required: Permission[]) => hasAllPermissions(permissions, required),
    [permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isAuthenticated: user !== null,
      isLoading: isPending,
      can,
      canAny,
      canAll,
      logout: () => logout(),
      isLoggingOut,
      refresh: refetch,
    }),
    [user, permissions, isPending, can, canAny, canAll, logout, isLoggingOut, refetch],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>. Add it to the dashboard layout.");
  }

  return context;
}

/**
 * Boolean permission check for conditional rendering.
 *
 * `usePermission(PERMISSIONS.provider.create)` reads better at a call site than
 * `useAuth().can(...)`, and it is the hook the resource framework uses.
 */
export function usePermission(required: Permission | Permission[] | undefined | null): boolean {
  return useAuth().can(required);
}

export function useCurrentUser(): SessionUser | null {
  return useAuth().user;
}
