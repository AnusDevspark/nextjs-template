"use client";

import { useState } from "react";
import { CheckIcon, FilterIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDebouncedCallback } from "@/hooks/use-debounced-value";
import { formatDate } from "@/lib/formatters";
import type { ListFilters } from "@/lib/query/list-query";
import { cn } from "@/lib/utils";

import { describeFilterValue, type FilterDefinition, type FilterOption } from "./filter-types";

export interface DataTableFiltersProps {
  filters: readonly FilterDefinition[];
  values: ListFilters;
  setFilter: (key: string, value: string | string[] | undefined) => void;
  clearFilters: () => void;
  disabled?: boolean;
}

/**
 * The filter bar: one control per definition, plus removable chips summarising
 * what is currently applied.
 *
 * Values live in the URL, so this component holds no state of its own beyond
 * transient popover open flags.
 */
export function DataTableFilters({
  filters,
  values,
  setFilter,
  clearFilters,
  disabled = false,
}: DataTableFiltersProps) {
  if (filters.length === 0) return null;

  const activeChips = filters
    .map((filter) => ({
      filter,
      description: describeFilterValue(filter, values[filter.key]),
    }))
    .filter((entry): entry is { filter: FilterDefinition; description: string } =>
      Boolean(entry.description),
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <FilterControl
          key={filter.key}
          filter={filter}
          values={values}
          setFilter={setFilter}
          disabled={disabled}
        />
      ))}

      {activeChips.length > 0 ? (
        <>
          <Separator orientation="vertical" className="h-6" />

          {activeChips.map(({ filter, description }) => (
            <Badge key={filter.key} variant="secondary" className="gap-1 font-normal">
              <span className="text-muted-foreground">{filter.label}:</span>
              {description}
              <button
                type="button"
                aria-label={`Clear ${filter.label} filter`}
                className="hover:text-foreground -mr-0.5 ml-0.5"
                onClick={() => setFilter(filter.key, undefined)}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}

          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
            Clear all
          </Button>
        </>
      ) : null}
    </div>
  );
}

function FilterControl({
  filter,
  values,
  setFilter,
  disabled,
}: {
  filter: FilterDefinition;
  values: ListFilters;
  setFilter: (key: string, value: string | string[] | undefined) => void;
  disabled: boolean;
}) {
  const value = values[filter.key];

  switch (filter.type) {
    case "text":
      return (
        <TextFilterControl
          label={filter.label}
          placeholder={filter.placeholder}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setFilter(filter.key, next || undefined)}
          disabled={disabled}
        />
      );

    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : "__all__"}
          onValueChange={(next) => setFilter(filter.key, next === "__all__" ? undefined : next)}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[8rem] gap-2">
            <span className="text-muted-foreground text-xs">{filter.label}</span>
            <SelectValue placeholder={filter.placeholder ?? "All"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi-select":
      return (
        <MultiSelectFilterControl
          label={filter.label}
          options={filter.options}
          values={Array.isArray(value) ? value : value ? [value] : []}
          onChange={(next) => setFilter(filter.key, next.length > 0 ? next : undefined)}
          disabled={disabled}
        />
      );

    case "boolean":
      return (
        <Select
          value={typeof value === "string" ? value : "__all__"}
          onValueChange={(next) => setFilter(filter.key, next === "__all__" ? undefined : next)}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[8rem] gap-2">
            <span className="text-muted-foreground text-xs">{filter.label}</span>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="true">{filter.trueLabel ?? "Yes"}</SelectItem>
            <SelectItem value="false">{filter.falseLabel ?? "No"}</SelectItem>
          </SelectContent>
        </Select>
      );

    case "date":
      return (
        <DateFilterControl
          label={filter.label}
          value={typeof value === "string" ? value : undefined}
          onChange={(next) => setFilter(filter.key, next)}
          disabled={disabled}
        />
      );

    case "date-range":
      return (
        <DateRangeFilterControl
          label={filter.label}
          from={asString(values[`${filter.key}From`])}
          to={asString(values[`${filter.key}To`])}
          onChange={(from, to) => {
            setFilter(`${filter.key}From`, from);
            setFilter(`${filter.key}To`, to);
          }}
          disabled={disabled}
        />
      );

    case "custom": {
      const Component = filter.component;
      return (
        <Component
          value={value}
          onChange={(next) => setFilter(filter.key, next)}
          filters={values}
          setFilter={setFilter}
        />
      );
    }
  }
}

function asString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Debounced so typing in a filter box does not fire a request per keystroke. */
function TextFilterControl({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const commit = useDebouncedCallback(onChange, 400);

  return (
    <Input
      value={draft}
      placeholder={placeholder ?? label}
      aria-label={label}
      disabled={disabled}
      className="h-8 w-[10rem]"
      onChange={(event) => {
        setDraft(event.target.value);
        commit(event.target.value);
      }}
    />
  );
}

function MultiSelectFilterControl({
  label,
  options,
  values,
  onChange,
  disabled,
}: {
  label: string;
  options: readonly FilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
  disabled: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2 border-dashed">
          <FilterIcon className="size-3.5" />
          {label}
          {values.length > 0 ? (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {values.length}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[14rem] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const checked = values.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() =>
                      onChange(
                        checked
                          ? values.filter((entry) => entry !== option.value)
                          : [...values, option.value],
                      )
                    }
                  >
                    <div
                      className={cn(
                        "border-primary flex size-4 items-center justify-center rounded-sm border",
                        checked ? "bg-primary text-primary-foreground" : "opacity-60",
                      )}
                    >
                      {checked ? <CheckIcon className="size-3" /> : null}
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DateFilterControl({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T00:00:00`) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2 border-dashed">
          <span className="text-muted-foreground text-xs">{label}</span>
          {selected ? formatDate(selected) : "Any"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? toIso(date) : undefined);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFilterControl({
  label,
  from,
  to,
  onChange,
  disabled,
}: {
  label: string;
  from: string | undefined;
  to: string | undefined;
  onChange: (from: string | undefined, to: string | undefined) => void;
  disabled: boolean;
}) {
  const range = from
    ? { from: new Date(`${from}T00:00:00`), to: to ? new Date(`${to}T00:00:00`) : undefined }
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2 border-dashed">
          <span className="text-muted-foreground text-xs">{label}</span>
          {from ? `${formatDate(from)} – ${to ? formatDate(to) : "…"}` : "Any"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="space-y-2 p-3 pb-0">
          <Label className="text-xs">{label}</Label>
        </div>
        <Calendar
          mode="range"
          selected={range}
          numberOfMonths={2}
          onSelect={(next) =>
            onChange(
              next?.from ? toIso(next.from) : undefined,
              next?.to ? toIso(next.to) : undefined,
            )
          }
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
