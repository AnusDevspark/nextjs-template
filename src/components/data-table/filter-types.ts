import type { ComponentType } from "react";

import type { ListFilters } from "@/lib/query/list-query";

/**
 * Filter definitions.
 *
 * The built-in types cover what most modules need. Anything they cannot express
 * uses `type: "custom"` with a component — the schema deliberately does not try
 * to describe every possible control, because that is how config formats turn
 * into unreadable mini-languages.
 */

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterBase {
  /** URL search param name, and the query key sent to the backend. */
  key: string;
  label: string;
}

export interface TextFilter extends FilterBase {
  type: "text";
  placeholder?: string;
}

export interface SelectFilter extends FilterBase {
  type: "select";
  options: readonly FilterOption[];
  placeholder?: string;
}

export interface MultiSelectFilter extends FilterBase {
  type: "multi-select";
  options: readonly FilterOption[];
}

export interface BooleanFilter extends FilterBase {
  type: "boolean";
  trueLabel?: string;
  falseLabel?: string;
}

export interface DateFilter extends FilterBase {
  type: "date";
}

/** Writes two params: `${key}From` and `${key}To`. */
export interface DateRangeFilter extends FilterBase {
  type: "date-range";
}

export interface CustomFilterProps {
  value: string | string[] | undefined;
  onChange: (value: string | string[] | undefined) => void;
  /** All active filters, for controls that depend on another filter's value. */
  filters: ListFilters;
  setFilter: (key: string, value: string | string[] | undefined) => void;
}

export interface CustomFilter extends FilterBase {
  type: "custom";
  component: ComponentType<CustomFilterProps>;
  /** Extra URL keys this filter owns, if it writes more than `key`. */
  extraKeys?: readonly string[];
}

export type FilterDefinition =
  | TextFilter
  | SelectFilter
  | MultiSelectFilter
  | BooleanFilter
  | DateFilter
  | DateRangeFilter
  | CustomFilter;

/** Every URL param the given filters read or write. */
export function collectFilterKeys(filters: readonly FilterDefinition[]): string[] {
  return filters.flatMap((filter) => {
    if (filter.type === "date-range") return [`${filter.key}From`, `${filter.key}To`];
    if (filter.type === "custom") return [filter.key, ...(filter.extraKeys ?? [])];
    return [filter.key];
  });
}

/** Keys that hold an array of values, needed by `parseListQuery`. */
export function collectMultiValueKeys(filters: readonly FilterDefinition[]): string[] {
  return filters.filter((filter) => filter.type === "multi-select").map((filter) => filter.key);
}

/** Human-readable summary of an active filter, for the removable chips. */
export function describeFilterValue(
  filter: FilterDefinition,
  value: string | string[] | undefined,
): string | undefined {
  if (value === undefined || (Array.isArray(value) && value.length === 0)) return undefined;

  switch (filter.type) {
    case "select": {
      const option = filter.options.find((entry) => entry.value === value);
      return option?.label ?? String(value);
    }
    case "multi-select": {
      const values = Array.isArray(value) ? value : [value];
      const labels = values.map(
        (entry) => filter.options.find((option) => option.value === entry)?.label ?? entry,
      );
      return labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;
    }
    case "boolean":
      return value === "true" ? (filter.trueLabel ?? "Yes") : (filter.falseLabel ?? "No");
    default:
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
}
