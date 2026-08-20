import type { StatusMap } from "@/components/common/status-badge";
import type { BaseListQuery } from "@/lib/query/list-query";

/**
 * User domain types — the view model, not the wire format.
 *
 * The API's DTO happens to match this almost exactly, so the mapper in
 * `user.api.ts` is nearly an identity function. That is the honest outcome when
 * a backend is well shaped; a mapper is written when shapes genuinely differ,
 * not for symmetry.
 */

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const userStatusMap: StatusMap<UserStatus> = {
  ACTIVE: { tone: "success", label: "Active" },
  INACTIVE: { tone: "muted", label: "Inactive" },
  SUSPENDED: { tone: "danger", label: "Suspended" },
};

/**
 * Roles are seeded rows in the database, not a compile-time enum — an operator
 * can add one without a deploy. These three ship with the template's seed and
 * exist to populate the role picker; treat the list as a default, not a limit.
 */
export const SEEDED_ROLES = ["SUPER_ADMIN", "ADMIN", "USER"] as const;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: UserStatus;
  /** The role's name, e.g. "ADMIN". One role per user. */
  role: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Creating a user requires a password; updating one never touches it.
 *
 * That asymmetry is the API's, not a frontend choice: password changes go
 * through /auth/change-password, which demands the current password.
 */
export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  status?: UserStatus;
}

/** Every field optional — the API rejects a PATCH with an empty body. */
export type UpdateUserInput = Partial<Omit<CreateUserInput, "password">>;

export type UserListQuery = BaseListQuery & {
  status?: string;
  role?: string;
};

export const userStatusOptions = USER_STATUSES.map((value) => ({
  value,
  label: userStatusMap[value].label ?? value,
}));

export const userRoleOptions = SEEDED_ROLES.map((value) => ({ value, label: value }));
