"use client";

import { useState, type ReactNode } from "react";
import type { Table } from "@tanstack/react-table";
import { SearchIcon, Settings2Icon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-value";
import type { ListFilters } from "@/lib/query/list-query";

import { DataTableFilters } from "./data-table-filters";
import type { FilterDefinition } from "./filter-types";

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  filters?: readonly FilterDefinition[];
  filterValues: ListFilters;
  setFilter: (key: string, value: string | string[] | undefined) => void;
  clearFilters: () => void;
  /** Buttons rendered on the right, e.g. Export. */
  actions?: ReactNode;
  showColumnToggle?: boolean;
  disabled?: boolean;
}

/**
 * Search, filters, column visibility and table-level actions.
 *
 * Search is debounced here rather than in the URL hook, so the input stays
 * responsive while the committed value — the one that drives the request — only
 * changes once typing pauses.
 */
export function DataTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters = [],
  filterValues,
  setFilter,
  clearFilters,
  actions,
  showColumnToggle = true,
  disabled = false,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <DataTableSearch
          value={search}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          disabled={disabled}
        />

        <div className="flex items-center gap-2">
          {actions}
          {showColumnToggle ? <ColumnVisibilityMenu table={table} /> : null}
        </div>
      </div>

      <DataTableFilters
        filters={filters}
        values={filterValues}
        setFilter={setFilter}
        clearFilters={clearFilters}
        disabled={disabled}
      />
    </div>
  );
}

export function DataTableSearch({
  value,
  onChange,
  placeholder = "Search…",
  disabled = false,
  debounceMs = 350,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const commit = useDebouncedCallback(onChange, debounceMs);

  // Resync when the URL changes from elsewhere — a cleared filter chip, or the
  // browser back button. Adjusting state during render (rather than in an
  // effect) avoids the extra render pass a `useEffect` + `setState` would cost.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <SearchIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        role="searchbox"
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        className="h-9 pr-8 pl-8"
        onChange={(event) => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
      />
      {draft ? (
        <button
          type="button"
          aria-label="Clear search"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
        >
          <XIcon className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function ColumnVisibilityMenu<TData>({ table }: { table: Table<TData> }) {
  const hideable = table.getAllColumns().filter((column) => column.getCanHide());

  if (hideable.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2Icon className="size-3.5" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideable.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
            // Keep the menu open so several columns can be toggled at once.
            onSelect={(event) => event.preventDefault()}
          >
            {columnLabel(column.id, column.columnDef.meta)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function columnLabel(id: string, meta: unknown): string {
  const label = (meta as { label?: string } | undefined)?.label;
  if (label) return label;

  return id.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
