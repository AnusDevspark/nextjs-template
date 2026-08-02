"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/status-badge";
import { createDateColumn, createTextColumn } from "@/components/data-table";
import { formatPhone } from "@/lib/formatters";

import { ProviderCell } from "./components/provider-cell";
import { providerStatusMap, type Provider } from "./provider.types";

/**
 * Provider table columns.
 *
 * A mix on purpose: the identity and contact columns are hand-written because
 * their presentation is specific, while "Started" uses a helper because a date
 * column is a date column. Both are plain `ColumnDef` objects, so mixing them
 * needs no adapter.
 *
 * A column is sortable when its `meta.sortField` is set — the value is the
 * field name the backend expects.
 */
export const providerColumns: ColumnDef<Provider, unknown>[] = [
  {
    id: "provider",
    header: "Provider",
    enableHiding: false,
    meta: { sortField: "lastName", label: "Provider" },
    cell: ({ row }) => <ProviderCell provider={row.original} />,
  },

  {
    id: "npi",
    header: "NPI",
    meta: { sortField: "npi", label: "NPI", priority: "low" },
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.npi}</span>,
  },

  {
    id: "contact",
    header: "Contact",
    meta: { label: "Contact" },
    cell: ({ row }) => (
      <div className="min-w-0 text-sm">
        <a
          href={`mailto:${row.original.email}`}
          className="block truncate underline-offset-4 hover:underline"
        >
          {row.original.email}
        </a>
        {row.original.phone ? (
          <span className="text-muted-foreground text-xs">{formatPhone(row.original.phone)}</span>
        ) : null}
      </div>
    ),
  },

  createTextColumn<Provider>({
    id: "facilityName",
    header: "Facility",
    label: "Facility",
    priority: "low",
    truncate: true,
  }),

  {
    id: "status",
    header: "Status",
    meta: { sortField: "status", label: "Status" },
    cell: ({ row }) => <StatusBadge status={row.original.status} map={providerStatusMap} />,
  },

  createDateColumn<Provider>({
    id: "startDate",
    header: "Started",
    sortField: "startDate",
    label: "Start date",
    priority: "low",
  }),
];
