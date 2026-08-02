import type { Permission } from "@/constants/permissions";

/**
 * Pure permission predicates.
 *
 * No React, no `server-only` — the same functions run in Server Components,
 * Client Components and tests. Everything else in the permission system
 * (`PermissionGuard`, `usePermission`, `requirePermission`) is a thin wrapper
 * around these three.
 */

export type PermissionInput = Permission | Permission[] | undefined | null;

/**
 * A permission set. `Set` keeps lookups O(1); a user in a large organisation
 * can easily carry a few hundred codes.
 */
export type PermissionSet = ReadonlySet<string>;

export function toPermissionSet(permissions: readonly string[] | undefined): PermissionSet {
  return new Set(permissions ?? []);
}

/**
 * An `undefined`/`null` requirement means "no permission needed" and passes.
 * That lets callers write `hasPermission(set, resource.permissions.export)`
 * without first checking whether the resource declares one.
 */
export function hasPermission(granted: PermissionSet, required: PermissionInput): boolean {
  if (required === undefined || required === null) return true;
  if (Array.isArray(required)) return hasAllPermissions(granted, required);
  return granted.has(required);
}

/** True when at least one of `required` is granted. An empty list passes. */
export function hasAnyPermission(granted: PermissionSet, required: readonly Permission[]): boolean {
  if (required.length === 0) return true;
  return required.some((permission) => granted.has(permission));
}

/** True when every entry in `required` is granted. An empty list passes. */
export function hasAllPermissions(
  granted: PermissionSet,
  required: readonly Permission[],
): boolean {
  return required.every((permission) => granted.has(permission));
}
