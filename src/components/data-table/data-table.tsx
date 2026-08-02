"use client";

import { useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";

import { EmptyState, FilteredEmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ListFilters, SortOrder } from "@/lib/query/list-query";
import { cn } from "@/lib/utils";

import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import type { FilterDefinition } from "./filter-types";

/**
 * Extra per-column information the table engine understands.
 *
 * Declared through TanStack's `meta` so column definitions stay ordinary
 * `ColumnDef` objects — no wrapper type, no restricted subset of the API.
 */
export interface DataTableColumnMeta {
  /** Backend sort field. Presence makes the header sortable. */
  sortField?: string;
  /** Label for the column-visibility menu. Defaults to a humanised id. */
  label?: string;
  align?: "left" | "right" | "center";
  /** `low` columns are hidden below the `lg` breakpoint. */
  priority?: "high" | "low";
  className?: string;
  headerClassName?: string;
}

declare module "@tanstack/react-table" {
  // Module augmentation: the interface must be empty and must repeat TanStack's
  // own type parameters, so both rules are disabled here deliberately.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface ColumnMeta<TData extends RowData, TValue> extends DataTableColumnMeta {}
}

// Re-exported so feature code can import the type without importing TanStack.
import type { RowData } from "@tanstack/react-table";

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];

  // --- Server-driven state ---
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;

  sortBy?: string;
  sortOrder?: SortOrder;
  onToggleSort?: (field: string) => void;

  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;

  filters?: readonly FilterDefinition[];
  filterValues?: ListFilters;
  setFilter?: (key: string, value: string | string[] | undefined) => void;
  clearFilters?: () => void;
  hasActiveFilters?: boolean;

  // --- Status ---
  /** First load, with nothing to show yet. Renders skeleton rows. */
  isLoading?: boolean;
  /** A background refetch. Dims the table without unmounting it. */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;

  // --- Presentation ---
  /** Used in default empty and error copy, e.g. "providers". */
  entityName?: string;
  emptyState?: ReactNode;
  /** Stable row identity. Required for selection to survive refetches. */
  getRowId?: (row: TData) => string;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (selectedIds: string[], rows: TData[]) => void;
  onRowClick?: (row: TData) => void;
  /** Card renderer used below `md`, when a table is the wrong shape for mobile. */
  mobileRenderer?: (row: TData) => ReactNode;
  toolbarActions?: ReactNode;
  showToolbar?: boolean;
  showColumnToggle?: boolean;
  className?: string;
}

/**
 * Production data table over TanStack Table.
 *
 * Owns pagination, sorting, search, filters, column visibility, selection,
 * loading, empty and error presentation. It does **not** own the columns —
 * those stay ordinary `ColumnDef` objects supplied by the feature, so any cell
 * can render any component.
 *
 * All of pagination/sorting/filtering is `manual`: the server does the work.
 * Loading a full table into the browser to slice it client-side does not
 * survive contact with a real dataset.
 */
export function DataTable<TData>({
  columns,
  data,
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  sortBy,
  sortOrder,
  onToggleSort,
  search = "",
  onSearchChange,
  searchPlaceholder,
  filters = [],
  filterValues = {},
  setFilter,
  clearFilters,
  hasActiveFilters = false,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  entityName = "records",
  emptyState,
  getRowId,
  enableRowSelection = false,
  onRowSelectionChange,
  onRowClick,
  mobileRenderer,
  toolbarActions,
  showToolbar = true,
  showColumnToggle = true,
  className,
}: DataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: totalPages,
    enableRowSelection,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: { columnVisibility, rowSelection },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);

      if (onRowSelectionChange) {
        const ids = Object.keys(next).filter((id) => next[id]);
        const rows = data.filter((row, index) =>
          ids.includes(getRowId ? getRowId(row) : String(index)),
        );
        onRowSelectionChange(ids, rows);
      }
    },
  });

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;
  const columnCount = table.getVisibleLeafColumns().length;

  const toolbar =
    showToolbar && onSearchChange && setFilter && clearFilters ? (
      <DataTableToolbar
        table={table}
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={filterValues}
        setFilter={setFilter}
        clearFilters={clearFilters}
        actions={toolbarActions}
        showColumnToggle={showColumnToggle}
        disabled={isLoading}
      />
    ) : null;

  // A failed first load has nothing to show around the error, so the error
  // replaces the table entirely. A failed refetch keeps the stale rows visible.
  if (error && data.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {toolbar}
        <div className="rounded-lg border">
          <ErrorState error={error} onRetry={onRetry} />
        </div>
      </div>
    );
  }

  const showEmpty = !isLoading && data.length === 0;

  // Rendered once, replacing both layouts. Duplicating it into the mobile and
  // desktop branches would put the same message in the DOM twice.
  if (showEmpty) {
    return (
      <div className={cn("space-y-4", className)}>
        {toolbar}
        <div className="rounded-lg border">
          {emptyState ?? (
            <DefaultEmpty
              entityName={entityName}
              filtered={hasActiveFilters}
              onClear={clearFilters}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {toolbar}

      {/*
        Card layout for small screens, when the feature supplies a renderer.
        Both layouts are in the DOM and CSS decides which is visible — the
        alternative, a JS media query, causes a hydration mismatch. Rows are
        server-paginated, so the duplication is bounded by the page size.

        No aria-hidden is needed: `display: none` from `md:hidden` already
        removes whichever layout is inactive from the accessibility tree.
      */}
      {mobileRenderer ? (
        <div className="space-y-3 md:hidden">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-lg" />
              ))
            : data.map((row, index) => (
                <div key={getRowId ? getRowId(row) : index}>{mobileRenderer(row)}</div>
              ))}
        </div>
      ) : null}

      <div
        className={cn(
          "relative rounded-lg border",
          mobileRenderer && "hidden md:block",
          isFetching && !isLoading && "opacity-60 transition-opacity",
        )}
        aria-busy={isFetching}
      >
        {/* Horizontal scroll is the fallback for wide tables on narrow screens. */}
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const isSorted = meta?.sortField && sortBy === meta.sortField;

                    return (
                      <TableHead
                        key={header.id}
                        style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                        aria-sort={
                          isSorted ? (sortOrder === "asc" ? "ascending" : "descending") : undefined
                        }
                        className={cn(
                          meta?.priority === "low" && "hidden lg:table-cell",
                          meta?.align === "right" && "text-right",
                          meta?.align === "center" && "text-center",
                          meta?.headerClassName,
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : renderHeader(header, {
                              sortBy,
                              sortOrder,
                              onToggleSort,
                            })}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <SkeletonRows rows={pageSize > 10 ? 8 : pageSize} columns={columnCount} />
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={
                      onRowClick
                        ? (event) => {
                            // Let buttons, links and menus inside a row work
                            // without also triggering row navigation.
                            if (
                              (event.target as HTMLElement).closest(
                                "button, a, input, [role='menuitem']",
                              )
                            ) {
                              return;
                            }
                            onRowClick(row.original);
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            meta?.priority === "low" && "hidden lg:table-cell",
                            meta?.align === "right" && "text-right",
                            meta?.align === "center" && "text-center",
                            meta?.className,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {total > 0 || page > 1 ? (
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          selectedCount={selectedCount}
          disabled={isLoading}
        />
      ) : null}
    </div>
  );
}

/**
 * Renders a header cell.
 *
 * A string header on a column with `meta.sortField` becomes a sort control
 * automatically; anything else is rendered verbatim, so a fully custom header
 * component still works.
 */
function renderHeader<TData>(
  header: ReturnType<
    ReturnType<typeof useReactTable<TData>>["getHeaderGroups"]
  >[number]["headers"][number],
  sort: { sortBy?: string; sortOrder?: SortOrder; onToggleSort?: (field: string) => void },
): ReactNode {
  const meta = header.column.columnDef.meta;
  const definition = header.column.columnDef.header;

  if (meta?.sortField && typeof definition === "string" && sort.onToggleSort) {
    return (
      <DataTableColumnHeader
        title={definition}
        sortField={meta.sortField}
        currentSortBy={sort.sortBy}
        currentSortOrder={sort.sortOrder}
        onToggleSort={sort.onToggleSort}
        align={meta.align}
      />
    );
  }

  return flexRender(definition, header.getContext());
}

function SkeletonRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <TableCell key={columnIndex}>
              <Skeleton className="h-5" style={{ width: `${55 + ((columnIndex * 37) % 40)}%` }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function DefaultEmpty({
  entityName,
  filtered,
  onClear,
}: {
  entityName: string;
  filtered: boolean;
  onClear?: () => void;
}) {
  if (filtered) {
    return (
      <FilteredEmptyState
        entityName={entityName}
        onReset={
          onClear ? (
            <Button variant="outline" size="sm" onClick={onClear}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      size="sm"
      title={`No ${entityName} yet`}
      description="Nothing has been created yet."
    />
  );
}
