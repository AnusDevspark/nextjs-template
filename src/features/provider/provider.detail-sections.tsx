"use client";

import {
  badgeListField,
  booleanField,
  dateField,
  dateTimeField,
  emailField,
  linkField,
  multilineField,
  phoneField,
  statusField,
  textField,
  type DetailSection,
} from "@/components/detail-view";

import { formatSpecialty, providerStatusMap, type Provider } from "./provider.types";

/**
 * Provider detail layout.
 *
 * Declarative sections rather than hand-written Card/grid markup — this is the
 * repetition the detail engine removes. Individual fields still drop to a
 * `render` function whenever the value needs real presentation, so the config
 * never becomes a straitjacket.
 */
export const providerDetailSections: DetailSection<Provider>[] = [
  {
    title: "Identity",
    fields: [
      textField<Provider>("First name", (provider) => provider.firstName),
      textField<Provider>("Last name", (provider) => provider.lastName),
      {
        label: "NPI",
        render: (provider) => <span className="font-mono">{provider.npi}</span>,
      },
      badgeListField<Provider>("Credentials", (provider) => provider.credentials),
    ],
  },
  {
    title: "Contact",
    fields: [
      emailField<Provider>("Email", (provider) => provider.email),
      phoneField<Provider>("Phone", (provider) => provider.phone),
    ],
  },
  {
    title: "Practice",
    fields: [
      textField<Provider>("Specialty", (provider) => formatSpecialty(provider.specialty)),

      // Links to the related resource's detail page, using that resource's own
      // route — no duplicated URL string.
      linkField<Provider>("Facility", (provider) =>
        provider.facilityId && provider.facilityName
          ? { label: provider.facilityName, href: `/facilities/${provider.facilityId}` }
          : null,
      ),

      statusField<Provider, Provider["status"]>(
        "Status",
        (provider) => provider.status,
        providerStatusMap,
      ),
      booleanField<Provider>("Accepting new patients", (provider) => provider.acceptingNewPatients),
      dateField<Provider>("Start date", (provider) => provider.startDate),
    ],
  },
  {
    title: "Notes",
    // Hidden entirely when there is nothing to show, rather than rendering a
    // card containing a single em dash.
    visible: (provider) => Boolean(provider.notes),
    fields: [multilineField<Provider>("Internal notes", (provider) => provider.notes)],
  },
  {
    title: "Record",
    columns: 3,
    fields: [
      dateTimeField<Provider>("Created", (provider) => provider.createdAt),
      dateTimeField<Provider>("Last updated", (provider) => provider.updatedAt),
      {
        label: "ID",
        render: (provider) => (
          <span className="text-muted-foreground font-mono text-xs">{provider.id}</span>
        ),
      },
    ],
  },
];
