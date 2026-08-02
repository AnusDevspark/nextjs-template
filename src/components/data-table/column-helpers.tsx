"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge, type StatusMap } from "@/components/common/status-badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatBoolean,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatList,
  formatNumber,
  formatText,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

import type { DataTableColumnMeta } from "./data-table";

/**
 * Shorthands for the column shapes that repeat across every module.
 *
 * These are conveniences, not a required abstraction: they return plain
 * `ColumnDef` objects, so a helper column and a hand-written one are the same
 * kind of thing and can sit side by side. Anything with real business
 * presentation should be written by hand.
 */

interface BaseColumnOptions<TData> {
  id?: string;
  header: string;
  /** Backend sort field. Makes the header a sort control. */
  sortField?: string;
  /** Label in the column-visibility menu. Defaults to `header`. */
  label?: string;
  align?: DataTableColumnMeta["align"];
  priority?: DataTableColumnMeta["priority"];
  className?: string;
  size?: number;
  enableHiding?: boolean;
  /** Reads the value. Defaults to `row[id]`. */
  accessor?: (row: TData) => unknown;
}

function baseColumn<TData>(options: BaseColumnOptions<TData>) {
  return {
    id: options.id,
    header: options.header,
    enableHiding: options.enableHiding ?? true,
    size: options.size,
    meta: {
      sortField: options.sortField,
      label: options.label ?? options.header,
      align: options.align,
      priority: options.priority,
      className: options.className,
    } satisfies DataTableColumnMeta,
  };
}

function read<TData>(
  row: TData,
  id: string | undefined,
  accessor?: (row: TData) => unknown,
): unknown {
  if (accessor) return accessor(row);
  if (!id) return undefined;

  return (row as Record<string, unknown>)[id];
}

export function createTextColumn<TData>(
  options: BaseColumnOptions<TData> & { truncate?: boolean },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) => (
      <span className={cn(options.truncate && "block max-w-[18rem] truncate")}>
        {formatText(read(row.original, options.id, options.accessor) as string)}
      </span>
    ),
  };
}

export function createDateColumn<TData>(
  options: BaseColumnOptions<TData> & { pattern?: string },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDate(read(row.original, options.id, options.accessor) as string, {
          pattern: options.pattern ?? "d MMM yyyy",
        })}
      </span>
    ),
  };
}

export function createDateTimeColumn<TData>(
  options: BaseColumnOptions<TData>,
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) => (
      <span className="whitespace-nowrap tabular-nums">
        {formatDateTime(read(row.original, options.id, options.accessor) as string)}
      </span>
    ),
  };
}

export function createBooleanColumn<TData>(
  options: BaseColumnOptions<TData> & { yes?: string; no?: string },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) =>
      formatBoolean(read(row.original, options.id, options.accessor) as boolean, {
        yes: options.yes,
        no: options.no,
      }),
  };
}

export function createNumberColumn<TData>(
  options: BaseColumnOptions<TData> & Intl.NumberFormatOptions,
): ColumnDef<TData, unknown> {
  const { id, header, sortField, label, align, priority, className, size, accessor, ...format } =
    options;

  return {
    ...baseColumn({
      id,
      header,
      sortField,
      label,
      align: align ?? "right",
      priority,
      className,
      size,
      accessor,
    }),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumber(read(row.original, id, accessor) as number, format)}
      </span>
    ),
  };
}

export function createCurrencyColumn<TData>(
  options: BaseColumnOptions<TData> & { currency?: string },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn({ ...options, align: options.align ?? "right" }),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(read(row.original, options.id, options.accessor) as number, {
          currency: options.currency,
        })}
      </span>
    ),
  };
}

export function createListColumn<TData>(
  options: BaseColumnOptions<TData> & { max?: number },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) =>
      formatList(read(row.original, options.id, options.accessor) as string[], {
        max: options.max ?? 2,
      }),
  };
}

export function createStatusColumn<TData, TStatus extends string>(
  options: BaseColumnOptions<TData> & { map: StatusMap<TStatus> },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) => {
      const status = read(row.original, options.id, options.accessor) as TStatus | null | undefined;
      if (!status) return "—";

      return <StatusBadge status={status} map={options.map} />;
    },
  };
}

/** Links the cell text to a detail route. */
export function createLinkColumn<TData>(
  options: BaseColumnOptions<TData> & { href: (row: TData) => string },
): ColumnDef<TData, unknown> {
  return {
    ...baseColumn(options),
    cell: ({ row }) => (
      <Link
        href={options.href(row.original)}
        className="font-medium underline-offset-4 hover:underline"
      >
        {formatText(read(row.original, options.id, options.accessor) as string)}
      </Link>
    ),
  };
}

/** Row-selection checkbox column. Place it first. */
export function createSelectColumn<TData>(): ColumnDef<TData, unknown> {
  return {
    id: "select",
    size: 40,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(checked) => table.toggleAllPageRowsSelected(Boolean(checked))}
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(checked) => row.toggleSelected(Boolean(checked))}
        aria-label="Select row"
      />
    ),
  };
}

/**
 * Trailing actions column.
 *
 * The resource framework builds this automatically from routes, permissions and
 * custom action definitions; this helper exists for tables outside that system.
 */
export function createActionsColumn<TData>(
  render: (row: TData) => ReactNode,
  options: { header?: string; size?: number } = {},
): ColumnDef<TData, unknown> {
  return {
    id: "actions",
    header: options.header ?? "",
    size: options.size ?? 56,
    enableHiding: false,
    meta: { align: "right", label: "Actions" },
    cell: ({ row }) => <div className="flex justify-end">{render(row.original)}</div>,
  };
}
