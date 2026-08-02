"use client";

import { useState } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { FormField, type BaseFieldProps } from "./form-field";

/**
 * Date fields store ISO `yyyy-MM-dd` strings, not `Date` objects.
 *
 * A `Date` carries a timezone, so a value picked at 23:00 in UTC+2 serializes
 * to the previous day. Keeping the wire format as a plain date string removes
 * that class of bug, and it is what the backend stores anyway.
 */

function toIsoDate(date: Date | undefined): string | undefined {
  if (!date) return undefined;

  // Build the string from local parts so the displayed day and the stored day
  // always agree.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export interface FormDatePickerProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  placeholder?: string;
  /** Blocks selection outside this window. */
  minDate?: Date;
  maxDate?: Date;
}

export function FormDatePicker<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  placeholder = "Pick a date",
  minDate,
  maxDate,
  ...fieldProps
}: FormDatePickerProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <DatePickerControl
          id={a11y.id}
          value={field.value ?? null}
          onChange={field.onChange}
          onBlur={field.onBlur}
          placeholder={placeholder}
          minDate={minDate}
          maxDate={maxDate}
          disabled={fieldProps.disabled ?? field.disabled}
          invalid={a11y.invalid}
          describedBy={a11y.describedBy}
        />
      )}
    </FormField>
  );
}

function DatePickerControl({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  minDate,
  maxDate,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  value: string | null;
  onChange: (value: string | undefined) => void;
  onBlur: () => void;
  placeholder: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = fromIsoDate(value);

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
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
          className={cn("w-full justify-start font-normal", !selected && "text-muted-foreground")}
        >
          <CalendarIcon className="size-4" />
          {selected ? formatDate(selected) : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          onSelect={(date) => {
            onChange(toIsoDate(date));
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

/** Value shape for a date-range field: `{ from?: string; to?: string }`. */
export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface FormDateRangeProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  placeholder?: string;
  numberOfMonths?: number;
}

export function FormDateRange<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  placeholder = "Pick a date range",
  numberOfMonths = 2,
  ...fieldProps
}: FormDateRangeProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => {
        const value = (field.value ?? {}) as DateRangeValue;
        const range: DateRange | undefined = value.from
          ? { from: fromIsoDate(value.from), to: fromIsoDate(value.to) }
          : undefined;

        const label =
          value.from && value.to
            ? `${formatDate(value.from)} – ${formatDate(value.to)}`
            : value.from
              ? `${formatDate(value.from)} – …`
              : placeholder;

        return (
          <Popover onOpenChange={(open) => !open && field.onBlur()}>
            <PopoverTrigger asChild>
              <Button
                id={a11y.id}
                type="button"
                variant="outline"
                aria-invalid={a11y.invalid}
                aria-describedby={a11y.describedBy}
                disabled={fieldProps.disabled ?? field.disabled}
                className={cn(
                  "w-full justify-start font-normal",
                  !value.from && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="size-4" />
                {label}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={range}
                defaultMonth={range?.from}
                numberOfMonths={numberOfMonths}
                onSelect={(next) =>
                  field.onChange(
                    next?.from ? { from: toIsoDate(next.from), to: toIsoDate(next.to) } : undefined,
                  )
                }
                autoFocus
              />
            </PopoverContent>
          </Popover>
        );
      }}
    </FormField>
  );
}

export { toIsoDate, fromIsoDate };
