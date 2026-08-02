"use client";

import type { ReactNode } from "react";

import type { Permission } from "@/constants/permissions";
import { useAuth } from "@/lib/auth/auth-context";

export interface PermissionGuardProps {
  children: ReactNode;
  /** All of these are required. */
  permission?: Permission | Permission[];
  /** Any one of these is enough. Combined with `permission` using AND. */
  anyPermission?: Permission[];
  /** Rendered when the check fails. Defaults to rendering nothing. */
  fallback?: ReactNode;
}

/**
 * Hides UI the current user is not allowed to use.
 *
 * This is presentation only. Hiding a button does not stop anyone from calling
 * the endpoint — the backend must reject it too. Its purpose is to avoid
 * showing actions that would fail.
 */
export function PermissionGuard({
  children,
  permission,
  anyPermission,
  fallback = null,
}: PermissionGuardProps) {
  const { can, canAny } = useAuth();

  const allowed =
    (permission === undefined || can(permission)) &&
    (anyPermission === undefined || canAny(anyPermission));

  return <>{allowed ? children : fallback}</>;
}
