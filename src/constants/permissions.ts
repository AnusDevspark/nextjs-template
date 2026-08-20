/**
 * The application's permission catalogue.
 *
 * Plain strings in a plain module, so this is readable from Server Components,
 * Client Components, navigation config and resource definitions alike. Keeping
 * one list means a permission rename is a single edit, and it doubles as
 * documentation of what the backend enforces.
 *
 * These codes must match what the backend puts in the session payload — they
 * mirror `src/shared/constants/permissions.constant.ts` in the API repo, key for
 * key. The frontend uses them for UX only; the backend is the security boundary.
 *
 * Add a group here when you add a module there. A code the backend never grants
 * is not an error, it just hides things forever — which is a confusing bug, so
 * keep the two lists in step.
 */
export const PERMISSIONS = {
  user: {
    view: "USER_VIEW",
    create: "USER_CREATE",
    edit: "USER_EDIT",
    delete: "USER_DELETE",
  },
  role: {
    manage: "ROLE_MANAGE",
  },
} as const;

type PermissionGroups = typeof PERMISSIONS;

/**
 * The union of every permission string above, e.g.
 * `"USER_VIEW" | "USER_CREATE" | ...`
 *
 * Typing checks against this union catches typos at compile time, which is the
 * main reason the catalogue is centralised.
 */
export type Permission = {
  [G in keyof PermissionGroups]: PermissionGroups[G][keyof PermissionGroups[G]];
}[keyof PermissionGroups];

/** Every permission code, useful for seeding a superuser in tests. */
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS).flatMap(
  (group) => Object.values(group) as Permission[],
);
