"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/status-badge";
import { createNumberColumn } from "@/components/data-table";

import { facilityStatusMap, formatFacilityType, type Facility } from "./facility.types";

/**
 * Facility table columns.
 *
 * The address cell is the interesting one: it renders a two-line block from a
 * nested object. No column-generator schema would express it, and it did not
 * need to — the engine takes ordinary `ColumnDef`s.
 */
export const facilityColumns: ColumnDef<Facility, unknown>[] = [
  {
    id: "name",
    header: "Facility",
    enableHiding: false,
    meta: { sortField: "name", label: "Facility" },
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          href={`/facilities/${row.original.id}`}
          className="block truncate font-medium underline-offset-4 hover:underline"
        >
          {row.original.name}
        </Link>
        <span className="text-muted-foreground font-mono text-xs">{row.original.code}</span>
      </div>
    ),
  },

  {
    id: "type",
    header: "Type",
    meta: { sortField: "type", label: "Type" },
    cell: ({ row }) => formatFacilityType(row.original.type),
  },

  {
    id: "address",
    header: "Address",
    meta: { label: "Address" },
    cell: ({ row }) => {
      const { address } = row.original;

      return (
        <div className="min-w-0 text-sm">
          <span className="block truncate">{address.line1}</span>
          <span className="text-muted-foreground text-xs">
            {address.city}, {address.state} {address.postalCode}
          </span>
        </div>
      );
    },
  },

  createNumberColumn<Facility>({
    id: "providerCount",
    header: "Providers",
    sortField: "providerCount",
    label: "Providers",
    priority: "low",
  }),

  createNumberColumn<Facility>({
    id: "departmentCount",
    header: "Departments",
    sortField: "departmentCount",
    label: "Departments",
    priority: "low",
  }),

  {
    id: "status",
    header: "Status",
    meta: { sortField: "status", label: "Status" },
    cell: ({ row }) => <StatusBadge status={row.original.status} map={facilityStatusMap} />,
  },
];
