"use client";

import type { ColumnDef } from "@tanstack/react-table";

import {
  createDateColumn,
  createLinkColumn,
  createNumberColumn,
  createStatusColumn,
  createTextColumn,
} from "@/components/data-table";

import { departmentStatusMap, type Department } from "./department.types";

/**
 * Department columns — entirely helper-built.
 *
 * Nothing here needs custom presentation, so nothing here is hand-written. When
 * a column does need it (see Provider's identity cell), it drops to a plain
 * `ColumnDef` in the same array with no ceremony.
 */
export const departmentColumns: ColumnDef<Department, unknown>[] = [
  createLinkColumn<Department>({
    id: "name",
    header: "Department",
    sortField: "name",
    enableHiding: false,
    href: (department) => `/departments/${department.id}`,
  }),

  createTextColumn<Department>({
    id: "code",
    header: "Code",
    sortField: "code",
  }),

  createTextColumn<Department>({
    id: "facilityName",
    header: "Facility",
    sortField: "facilityName",
    truncate: true,
  }),

  createNumberColumn<Department>({
    id: "headCount",
    header: "Staff",
    sortField: "headCount",
    priority: "low",
  }),

  createStatusColumn<Department, Department["status"]>({
    id: "status",
    header: "Status",
    sortField: "status",
    map: departmentStatusMap,
  }),

  createDateColumn<Department>({
    id: "createdAt",
    header: "Created",
    sortField: "createdAt",
    priority: "low",
  }),
];
