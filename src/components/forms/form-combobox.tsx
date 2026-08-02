"use client";

import { useState } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { AsyncCombobox, type ComboboxOption, type ComboboxPage } from "./async-combobox";
import { FormField, type BaseFieldProps } from "./form-field";
import type { SelectOption } from "./form-inputs";

/**
 * Searchable select over a fixed option list.
 *
 * Use this instead of `FormSelect` once a list passes roughly 10 entries —
 * below that the search box is friction, above it scanning becomes the problem.
 */
export interface FormComboboxProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  options: readonly SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function FormCombobox<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  ...fieldProps
}: FormComboboxProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <ComboboxControl
          id={a11y.id}
          value={field.value ?? null}
          onChange={field.onChange}
          onBlur={field.onBlur}
          options={options}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          disabled={fieldProps.disabled ?? field.disabled}
          invalid={a11y.invalid}
          describedBy={a11y.describedBy}
        />
      )}
    </FormField>
  );
}

function ComboboxControl({
  id,
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onBlur: () => void;
  options: readonly SelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) onBlur();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  disabled={option.disabled}
                  onSelect={() => {
                    // Selecting the current value clears it — a cheap way to
                    // deselect an optional field without a separate control.
                    onChange(option.value === value ? null : option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn("size-4", value === option.value ? "opacity-100" : "opacity-0")}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Form field backed by an API-paginated lookup.
 *
 * Feature-level selects (`FacilitySelect`, `ProviderSelect`) are built by
 * partially applying this — see `src/features/facility/components/facility-select.tsx`.
 */
export interface FormAsyncComboboxProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  queryKey: string;
  loadOptions: (params: {
    search: string;
    page: number;
    signal?: AbortSignal;
  }) => Promise<ComboboxPage>;
  loadSelected?: (value: string, signal?: AbortSignal) => Promise<ComboboxOption | null>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  clearable?: boolean;
  /** Notified alongside the field update, for dependent fields. */
  onSelect?: (option: ComboboxOption | null) => void;
}

export function FormAsyncCombobox<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  queryKey,
  loadOptions,
  loadSelected,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  clearable,
  onSelect,
  ...fieldProps
}: FormAsyncComboboxProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <AsyncCombobox
          id={a11y.id}
          value={field.value ?? null}
          onChange={(next, option) => {
            field.onChange(next);
            onSelect?.(option);
          }}
          onBlur={field.onBlur}
          queryKey={queryKey}
          loadOptions={loadOptions}
          loadSelected={loadSelected}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          clearable={clearable}
          disabled={fieldProps.disabled ?? field.disabled}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
        />
      )}
    </FormField>
  );
}

export type { ComboboxOption, ComboboxPage };
