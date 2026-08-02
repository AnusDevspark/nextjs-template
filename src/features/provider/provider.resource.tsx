"use client";

import { UserMinusIcon } from "lucide-react";

import type { FilterDefinition } from "@/components/data-table";
import { PERMISSIONS } from "@/constants/permissions";
import { defineResource } from "@/framework/resource";
import { clientApi } from "@/lib/api";

import { ProviderForm } from "./components/provider-form";
import { ProviderMobileCard } from "./components/provider-cell";
import { deactivateProvider, providerApi } from "./provider.api";
import { providerColumns } from "./provider.columns";
import { providerDetailSections } from "./provider.detail-sections";
import { providerFormDefaults, providerFormSchema } from "./provider.schema";
import {
  providerFullName,
  providerStatusOptions,
  specialtyOptions,
  type Provider,
} from "./provider.types";

/**
 * Provider filters.
 *
 * `status` is single-select, `specialty` multi-select. Both are ordinary
 * configuration; a filter that needed a custom control would use
 * `type: "custom"` — see `facility.resource.ts`.
 */
const providerFilters: FilterDefinition[] = [
  {
    key: "status",
    type: "select",
    label: "Status",
    options: providerStatusOptions,
  },
  {
    key: "specialty",
    type: "multi-select",
    label: "Specialty",
    options: specialtyOptions,
  },
  {
    key: "acceptingNewPatients",
    type: "boolean",
    label: "Accepting patients",
    trueLabel: "Accepting",
    falseLabel: "Not accepting",
  },
];

/**
 * The Provider resource.
 *
 * `"use client"` because this object references client components (the columns'
 * cells, the custom form, the detail sections). That makes the whole definition
 * a single client reference, so a Server Component page can pass it straight to
 * `<ResourceListPage resource={providerResource} />` without React trying to
 * serialize the functions inside it.
 *
 * This is the richest of the three examples: custom cells, a custom form
 * component, a business action, and export.
 */
export const providerResource = defineResource({
  key: "provider",
  name: "Provider",
  pluralName: "Providers",
  description: "Clinicians, their specialties and facility affiliations.",

  getId: (provider: Provider) => provider.id,
  getLabel: providerFullName,

  routes: {
    list: "/providers",
    create: "/providers/create",
    detail: (id) => `/providers/${id}`,
    edit: (id) => `/providers/${id}/edit`,
  },

  permissions: {
    view: PERMISSIONS.provider.view,
    create: PERMISSIONS.provider.create,
    edit: PERMISSIONS.provider.edit,
    delete: PERMISSIONS.provider.delete,
    export: PERMISSIONS.provider.export,
  },

  api: providerApi,

  list: {
    columns: providerColumns,
    filters: providerFilters,
    defaultSort: { field: "lastName", order: "asc" },
    searchPlaceholder: "Search by name, email or NPI…",
    mobileRenderer: (provider) => <ProviderMobileCard provider={provider} />,
  },

  form: {
    schema: providerFormSchema,
    defaultValues: providerFormDefaults,

    // Form Mode 2: a custom component. `fields` is ignored when this is set.
    component: ProviderForm,

    // The record and the form disagree in small ways — nullable strings that
    // the inputs want as empty strings — so the mapping is explicit.
    toFormValues: (provider) => ({
      firstName: provider.firstName,
      lastName: provider.lastName,
      email: provider.email,
      phone: provider.phone ?? "",
      npi: provider.npi,
      specialty: provider.specialty,
      credentials: provider.credentials,
      status: provider.status,
      facilityId: provider.facilityId,
      acceptingNewPatients: provider.acceptingNewPatients,
      startDate: provider.startDate,
      notes: provider.notes ?? "",
    }),

    // Empty strings mean "not provided" to this backend, not "set to blank".
    toCreateInput: (values) => ({
      ...values,
      phone: values.phone || null,
      notes: values.notes || null,
    }),

    toUpdateInput: (values) => ({
      ...values,
      phone: values.phone || null,
      notes: values.notes || null,
    }),
  },

  details: {
    sections: providerDetailSections,
  },

  actions: {
    custom: [
      {
        key: "deactivate",
        label: "Deactivate",
        icon: UserMinusIcon,
        permission: PERMISSIONS.provider.edit,
        variant: "destructive",
        separatorBefore: true,

        // A business action, not CRUD: it only makes sense for an active
        // provider, so it disappears rather than erroring.
        visible: (provider) => provider.status === "ACTIVE",

        confirm: (provider) => ({
          title: "Deactivate provider?",
          description: `${providerFullName(provider)} will stop appearing in scheduling and referrals. You can reactivate them later.`,
          confirmLabel: "Deactivate",
          destructive: true,
        }),

        onClick: async (provider, { refresh }) => {
          await deactivateProvider(provider.id, "Deactivated from provider list", clientApi);
          refresh();
        },
      },
    ],
  },

  export: {
    path: "/providers/export",
    formats: ["csv", "xlsx"],
    filenameBase: "providers",
  },

  messages: {
    created: (provider) => `${providerFullName(provider)} created`,
    updated: (provider) => `${providerFullName(provider)} updated`,
    deleted: (label) => `${label} deleted`,
  },
});
