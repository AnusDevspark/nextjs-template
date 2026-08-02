"use client";

import { dateTimeField, textField, type DetailSection } from "@/components/detail-view";
import { PERMISSIONS } from "@/constants/permissions";
import { facilityApi } from "@/features/facility";
import { defineResource } from "@/framework/resource";
import { clientApi } from "@/lib/api";

import { departmentApi } from "./department.api";
import { departmentColumns } from "./department.columns";
import { departmentFormDefaults, departmentFormSchema } from "./department.schema";
import { departmentStatusOptions, type Department } from "./department.types";

/**
 * The Department resource — a complete CRUD module in one file.
 *
 * List, search, sort, filter, URL state, pagination, create, edit, detail,
 * delete with confirmation, permissions, breadcrumbs, toasts, cache
 * invalidation and backend error mapping all come from the framework. What
 * remains below is only what makes Department *Department*.
 *
 * This is the payoff the architecture is for. Compare it with
 * `provider.resource.tsx`, which opts out of the generic form and adds a
 * business action — the two sit at opposite ends of the same system.
 */

const departmentDetailSections: DetailSection<Department>[] = [
  {
    title: "Department",
    fields: [
      textField<Department>("Name", (department) => department.name),
      textField<Department>("Code", (department) => department.code),
      textField<Department>("Facility", (department) => department.facilityName),
      textField<Department>("Staff", (department) => department.headCount),
      textField<Department>("Description", (department) => department.description),
    ],
  },
  {
    title: "Record",
    fields: [
      dateTimeField<Department>("Created", (department) => department.createdAt),
      dateTimeField<Department>("Last updated", (department) => department.updatedAt),
    ],
  },
];

export const departmentResource = defineResource({
  key: "department",
  name: "Department",
  pluralName: "Departments",
  description: "Organisational units within a facility.",

  getId: (department: Department) => department.id,
  getLabel: (department: Department) => department.name,

  routes: {
    list: "/departments",
    create: "/departments/create",
    detail: (id) => `/departments/${id}`,
    edit: (id) => `/departments/${id}/edit`,
  },

  permissions: {
    view: PERMISSIONS.department.view,
    create: PERMISSIONS.department.create,
    edit: PERMISSIONS.department.edit,
    delete: PERMISSIONS.department.delete,
  },

  api: departmentApi,

  list: {
    columns: departmentColumns,
    filters: [{ key: "status", type: "select", label: "Status", options: departmentStatusOptions }],
    defaultSort: { field: "name", order: "asc" },
  },

  form: {
    schema: departmentFormSchema,
    defaultValues: departmentFormDefaults,

    // Form Mode 1: configuration only. No form component is written for this
    // module at all.
    fields: [
      { type: "text", name: "name", label: "Name", required: true },
      { type: "text", name: "code", label: "Code", placeholder: "CARD", required: true },
      {
        type: "async-combobox",
        name: "facilityId",
        label: "Facility",
        queryKey: "facility",
        required: true,
        loadOptions: ({ search, page, signal }) =>
          facilityApi.lookup!({ search, page }, { client: clientApi, signal }),
        loadSelected: (value, signal) =>
          facilityApi.lookupOne!(value, { client: clientApi, signal }),
      },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: departmentStatusOptions,
        required: true,
      },
      { type: "textarea", name: "description", label: "Description", rows: 3 },
    ],

    toFormValues: (department) => ({
      name: department.name,
      code: department.code,
      facilityId: department.facilityId,
      status: department.status,
      description: department.description ?? "",
    }),

    toCreateInput: (values) => ({ ...values, description: values.description || null }),
    toUpdateInput: (values) => ({ ...values, description: values.description || null }),
  },

  details: {
    sections: departmentDetailSections,
  },
});
