"use client";

import type { ColumnDef } from "@tanstack/react-table";

import {
  createDateColumn,
  createLinkColumn,
  createStatusColumn,
  createTextColumn,
} from "@/components/data-table";

import { userStatusMap, type User } from "./user.types";

/**
 * User columns.
 *
 * `sortField` values are not free-form: the API whitelists what it will sort by
 * (firstName, lastName, email, status, createdAt) and answers a 400 — not a
 * silent fallback — for anything else. Offering a sortable column the backend
 * does not support would turn a click into an error toast, so `role` is
 * displayed but deliberately not sortable.
 */
export const userColumns: ColumnDef<User, unknown>[] = [
  createLinkColumn<User>({
    id: "fullName",
    header: "Name",
    sortField: "lastName",
    enableHiding: false,
    href: (user) => `/users/${user.id}`,
  }),

  createTextColumn<User>({
    id: "email",
    header: "Email",
    sortField: "email",
    truncate: true,
  }),

  createTextColumn<User>({
    id: "role",
    header: "Role",
  }),

  createStatusColumn<User, User["status"]>({
    id: "status",
    header: "Status",
    sortField: "status",
    map: userStatusMap,
  }),

  createDateColumn<User>({
    id: "createdAt",
    header: "Created",
    sortField: "createdAt",
    priority: "low",
  }),
];
