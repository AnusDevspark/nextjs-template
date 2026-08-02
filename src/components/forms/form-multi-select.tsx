"use client";

import { useState } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import { FormField, type BaseFieldProps } from "./form-field";
import type { SelectOption } from "./form-inputs";

export interface FormMultiSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  options: readonly SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Chips shown before collapsing into "+N more". */
  maxDisplay?: number;
}

/**
 * Multi-select over a fixed option list, bound to a `string[]` field.
 *
 * The value is always an array — never `undefined` — so a Zod
 * `z.array(z.string())` schema validates cleanly and the caller never has to
 * write `value ?? []` at the use site.
 */
export function FormMultiSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results found.",
  maxDisplay = 3,
  ...fieldProps
}: FormMultiSelectProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <MultiSelectControl
          id={a11y.id}
          values={Array.isArray(field.value) ? (field.value as string[]) : []}
          onChange={field.onChange}
          onBlur={field.onBlur}
          options={options}
          placeholder={placeholder}
          searchPlaceholder={searchPlaceholder}
          emptyMessage={emptyMessage}
          maxDisplay={maxDisplay}
          disabled={fieldProps.disabled ?? field.disabled}
          invalid={a11y.invalid}
          describedBy={a11y.describedBy}
        />
      )}
    </FormField>
  );
}

function MultiSelectControl({
  id,
  values,
  onChange,
  onBlur,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  maxDisplay,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  values: string[];
  onChange: (values: string[]) => void;
  onBlur: () => void;
  options: readonly SelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  maxDisplay: number;
  disabled?: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);

  const selected = options.filter((option) => values.includes(option.value));
  const visible = selected.slice(0, maxDisplay);
  const overflow = selected.length - visible.length;

  function toggle(value: string) {
    onChange(
      values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value],
    );
  }

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
          className="h-auto min-h-9 w-full justify-between py-1.5 font-normal"
        >
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap items-center gap-1">
              {visible.map((option) => (
                <Badge key={option.value} variant="secondary" className="gap-1 font-normal">
                  {option.label}
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${option.label}`}
                    className="hover:text-foreground"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggle(option.value);
                    }}
                  >
                    <XIcon className="size-3" />
                  </span>
                </Badge>
              ))}
              {overflow > 0 ? (
                <Badge variant="secondary" className="font-normal">
                  +{overflow} more
                </Badge>
              ) : null}
            </span>
          )}

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
                  // Stay open: selecting several values is the whole point.
                  onSelect={() => toggle(option.value)}
                >
                  <div
                    className={cn(
                      "border-primary flex size-4 items-center justify-center rounded-sm border",
                      values.includes(option.value)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-60",
                    )}
                  >
                    {values.includes(option.value) ? <CheckIcon className="size-3" /> : null}
                  </div>
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
