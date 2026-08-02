"use client";

import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SortOrder } from "@/lib/query/list-query";
import { cn } from "@/lib/utils";

export interface DataTableColumnHeaderProps {
  title: string;
  /** The backend sort field. Omit to render a plain, non-sortable header. */
  sortField?: string;
  currentSortBy?: string;
  currentSortOrder?: SortOrder;
  onToggleSort?: (field: string) => void;
  align?: "left" | "right" | "center";
  className?: string;
}

/**
 * Sortable column header.
 *
 * Sorting is server-side, so this only reflects and requests state — it never
 * reorders rows locally. `aria-sort` is set on the header cell by `DataTable`;
 * the icon here is the visual counterpart.
 */
export function DataTableColumnHeader({
  title,
  sortField,
  currentSortBy,
  currentSortOrder,
  onToggleSort,
  align = "left",
  className,
}: DataTableColumnHeaderProps) {
  if (!sortField || !onToggleSort) {
    return (
      <span
        className={cn(
          "text-muted-foreground text-xs font-medium",
          align === "right" && "block text-right",
          align === "center" && "block text-center",
          className,
        )}
      >
        {title}
      </span>
    );
  }

  const isActive = currentSortBy === sortField;
  const Icon = !isActive
    ? ChevronsUpDownIcon
    : currentSortOrder === "asc"
      ? ArrowUpIcon
      : ArrowDownIcon;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onToggleSort(sortField)}
      className={cn(
        "-mx-2 h-7 gap-1 px-2 text-xs font-medium",
        isActive ? "text-foreground" : "text-muted-foreground",
        align === "right" && "ml-auto",
        align === "center" && "mx-auto",
        className,
      )}
    >
      {title}
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">
        {isActive
          ? `Sorted ${currentSortOrder === "asc" ? "ascending" : "descending"}. Activate to change.`
          : "Not sorted. Activate to sort ascending."}
      </span>
    </Button>
  );
}
