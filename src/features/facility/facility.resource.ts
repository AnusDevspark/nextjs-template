"use client";

import type { FilterDefinition } from "@/components/data-table";
import { PERMISSIONS } from "@/constants/permissions";
import { defineResource, type ResourceFormField } from "@/framework/resource";

import { FacilityDetails } from "./components/facility-details";
import { FacilityStateFilter } from "./components/facility-state-filter";
import { facilityApi } from "./facility.api";
import { facilityColumns } from "./facility.columns";
import {
  facilityFormDefaults,
  facilityFormSchema,
  type FacilityFormValues,
} from "./facility.schema";
import { facilityStatusOptions, facilityTypeOptions, type Facility } from "./facility.types";

/**
 * Facility filters — three configured, one custom.
 *
 * The custom one fetches its options from the API. It still writes to the URL
 * and resets pagination like the others, because the engine passes it the same
 * value/setter every filter gets.
 */
const facilityFilters: FilterDefinition[] = [
  {
    key: "type",
    type: "multi-select",
    label: "Type",
    options: facilityTypeOptions,
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    options: facilityStatusOptions,
  },
  {
    key: "state",
    type: "custom",
    label: "State",
    component: FacilityStateFilter,
  },
  {
    key: "city",
    type: "text",
    label: "City",
    placeholder: "City",
  },
];

/**
 * Facility form fields (form Mode 1).
 *
 * Configuration rather than a custom component — the layout is a grid of
 * labelled inputs, so there is nothing for a hand-written component to add.
 * Nested paths (`address.city`) work because React Hook Form and Zod both
 * understand them, which means a backend error on `address.postalCode` lands on
 * the right input without any extra mapping.
 */
const facilityFormFields: ResourceFormField<FacilityFormValues>[] = [
  {
    type: "section",
    title: "Facility",
    fields: [
      { type: "text", name: "name", label: "Name", required: true },
      {
        type: "text",
        name: "code",
        label: "Code",
        description: "3–12 uppercase letters, digits or hyphens",
        placeholder: "MAIN-01",
        required: true,
      },
      { type: "select", name: "type", label: "Type", options: facilityTypeOptions, required: true },
      {
        type: "select",
        name: "status",
        label: "Status",
        options: facilityStatusOptions,
        required: true,
      },
      {
        type: "number",
        name: "bedCount",
        label: "Bed count",
        // Only hospitals and surgery centres have beds; the field disappears
        // for the rest rather than sitting there inviting a meaningless zero.
        visible: (values) => values.type === "HOSPITAL" || values.type === "SURGERY_CENTER",
      },
      { type: "date", name: "openedOn", label: "Opened on" },
    ],
  },
  {
    type: "section",
    title: "Address",
    fields: [
      {
        type: "text",
        name: "address.line1",
        label: "Street address",
        required: true,
        fullWidth: true,
      },
      { type: "text", name: "address.line2", label: "Address line 2", fullWidth: true },
      { type: "text", name: "address.city", label: "City", required: true },
      { type: "text", name: "address.state", label: "State", required: true },
      { type: "text", name: "address.postalCode", label: "Postal code", required: true },
      { type: "text", name: "address.country", label: "Country", required: true },
    ],
  },
  {
    type: "section",
    title: "Contact",
    fields: [
      { type: "tel", name: "phone", label: "Phone" },
      { type: "email", name: "email", label: "Email" },
    ],
  },
];

/**
 * The Facility resource.
 *
 * Built to differ from Provider in every dimension that matters: a different
 * backend envelope with zero-indexed pages, a nested address, a configured form
 * instead of a custom one, a custom detail component instead of sections, and a
 * custom filter. It reuses the identical engines regardless.
 */
export const facilityResource = defineResource({
  key: "facility",
  name: "Facility",
  pluralName: "Facilities",
  description: "Hospitals, clinics and other sites of care.",

  getId: (facility: Facility) => facility.id,
  getLabel: (facility: Facility) => facility.name,

  routes: {
    list: "/facilities",
    create: "/facilities/create",
    detail: (id) => `/facilities/${id}`,
    edit: (id) => `/facilities/${id}/edit`,
  },

  permissions: {
    view: PERMISSIONS.facility.view,
    create: PERMISSIONS.facility.create,
    edit: PERMISSIONS.facility.edit,
    delete: PERMISSIONS.facility.delete,
  },

  api: facilityApi,

  list: {
    columns: facilityColumns,
    filters: facilityFilters,
    defaultSort: { field: "name", order: "asc" },
    searchPlaceholder: "Search facilities by name or code…",
  },

  form: {
    schema: facilityFormSchema,
    defaultValues: facilityFormDefaults,
    fields: facilityFormFields,

    toFormValues: (facility) => ({
      name: facility.name,
      code: facility.code,
      type: facility.type,
      status: facility.status,
      address: {
        line1: facility.address.line1,
        line2: facility.address.line2 ?? "",
        city: facility.address.city,
        state: facility.address.state,
        postalCode: facility.address.postalCode,
        country: facility.address.country,
      },
      phone: facility.phone ?? "",
      email: facility.email ?? "",
      bedCount: facility.bedCount,
      openedOn: facility.openedOn,
    }),

    toCreateInput: (values) => ({
      ...values,
      address: { ...values.address, line2: values.address.line2 || null },
      phone: values.phone || null,
      email: values.email || null,
    }),

    toUpdateInput: (values) => ({
      ...values,
      address: { ...values.address, line2: values.address.line2 || null },
      phone: values.phone || null,
      email: values.email || null,
    }),
  },

  details: {
    // Details Mode 2: a custom component replaces the generated sections.
    component: FacilityDetails,
  },
});
