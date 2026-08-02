/**
 * The application's permission catalogue.
 *
 * Plain strings in a plain module, so this is readable from Server Components,
 * Client Components, navigation config and resource definitions alike. Keeping
 * one list means a permission rename is a single edit, and it doubles as
 * documentation of what the backend enforces.
 *
 * These codes must match what the backend puts in the session payload.
 * The frontend uses them for UX only — the backend is the security boundary.
 */
export const PERMISSIONS = {
  provider: {
    view: "PROVIDER_VIEW",
    create: "PROVIDER_CREATE",
    edit: "PROVIDER_EDIT",
    delete: "PROVIDER_DELETE",
    export: "PROVIDER_EXPORT",
  },
  facility: {
    view: "FACILITY_VIEW",
    create: "FACILITY_CREATE",
    edit: "FACILITY_EDIT",
    delete: "FACILITY_DELETE",
  },
  department: {
    view: "DEPARTMENT_VIEW",
    create: "DEPARTMENT_CREATE",
    edit: "DEPARTMENT_EDIT",
    delete: "DEPARTMENT_DELETE",
  },
} as const;

type PermissionGroups = typeof PERMISSIONS;

/**
 * The union of every permission string above, e.g.
 * `"PROVIDER_VIEW" | "PROVIDER_CREATE" | ...`
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
