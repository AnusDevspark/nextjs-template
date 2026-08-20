"use client";

import { dateTimeField, textField, type DetailSection } from "@/components/detail-view";
import { PERMISSIONS } from "@/constants/permissions";
import { defineResource } from "@/framework/resource";

import { userApi } from "./user.api";
import { userColumns } from "./user.columns";
import { userFormDefaults, userFormSchema, type UserFormValues } from "./user.schema";
import { userRoleOptions, userStatusOptions, type User } from "./user.types";

/**
 * The User resource — a complete CRUD module in one file.
 *
 * List, search, sort, filter, URL state, pagination, create, edit, detail,
 * delete with confirmation, permissions, breadcrumbs, toasts, cache
 * invalidation and backend error mapping all come from the framework. What
 * remains below is only what makes User *User*.
 *
 * This is the template's one worked example. Copy the shape of this directory
 * for your first real module — `docs/adding-a-resource.md` walks through it
 * step by step.
 */

const userDetailSections: DetailSection<User>[] = [
  {
    title: "Account",
    fields: [
      textField<User>("Name", (user) => user.fullName),
      textField<User>("Email", (user) => user.email),
      textField<User>("Role", (user) => user.role),
      textField<User>("Status", (user) => user.status),
    ],
  },
  {
    title: "Record",
    fields: [
      dateTimeField<User>("Created", (user) => user.createdAt),
      dateTimeField<User>("Last updated", (user) => user.updatedAt),
    ],
  },
];

/** Shared by both modes; create prepends the password field. */
const identityFields = [
  { type: "text", name: "firstName", label: "First name", required: true },
  { type: "text", name: "lastName", label: "Last name", required: true },
  { type: "email", name: "email", label: "Email", required: true },
] as const;

const roleFields = [
  { type: "select", name: "role", label: "Role", options: userRoleOptions, required: true },
  { type: "select", name: "status", label: "Status", options: userStatusOptions, required: true },
] as const;

export const userResource = defineResource({
  key: "user",
  name: "User",
  pluralName: "Users",
  description: "People with access to this application.",

  getId: (user: User) => user.id,
  getLabel: (user: User) => user.fullName,

  routes: {
    list: "/users",
    create: "/users/create",
    detail: (id) => `/users/${id}`,
    edit: (id) => `/users/${id}/edit`,
  },

  permissions: {
    view: PERMISSIONS.user.view,
    create: PERMISSIONS.user.create,
    edit: PERMISSIONS.user.edit,
    delete: PERMISSIONS.user.delete,
  },

  api: userApi,

  list: {
    columns: userColumns,
    filters: [
      { key: "status", type: "select", label: "Status", options: userStatusOptions },
      { key: "role", type: "select", label: "Role", options: userRoleOptions },
    ],
    // Matches the API's own default, so the first request the page makes is the
    // one the backend would have answered anyway.
    defaultSort: { field: "createdAt", order: "desc" },
  },

  form: {
    schema: userFormSchema,
    defaultValues: userFormDefaults,

    // A password is required to create an account and cannot be changed here —
    // /auth/change-password owns that, and it demands the current password. So
    // the two modes genuinely differ in their fields, not just their values.
    createFields: [
      ...identityFields,
      {
        type: "password",
        name: "password",
        label: "Password",
        description: "At least 10 characters.",
        required: true,
        autoComplete: "new-password",
      },
      ...roleFields,
    ],
    editFields: [...identityFields, ...roleFields],

    toFormValues: (user) => ({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      // Never populated from the record — the API does not return it and the
      // edit form does not render it.
      password: "",
      role: user.role,
      status: user.status,
    }),

    toCreateInput: (values: UserFormValues) => ({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      role: values.role,
      status: values.status,
    }),

    // `password` is deliberately absent: the API's update schema has no such
    // field, and Zod there strips unknown keys, so sending it would be a silent
    // no-op rather than an error.
    toUpdateInput: (values: UserFormValues) => ({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      role: values.role,
      status: values.status,
    }),
  },

  details: {
    sections: userDetailSections,
  },
});
