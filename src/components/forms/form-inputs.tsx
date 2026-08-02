"use client";

import type { ComponentProps, ReactNode } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { FormField, type BaseFieldProps } from "./form-field";

/**
 * Typed field components for React Hook Form.
 *
 * Each takes `control` and a `name` constrained to the form's field paths, so
 * a renamed schema key becomes a compile error instead of a silently
 * uncontrolled input. The generics stop at two parameters on purpose — deeper
 * inference would buy nothing and make the errors unreadable.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// --- Text ------------------------------------------------------------------

export interface FormInputProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  type?: "text" | "email" | "password" | "tel" | "url" | "number" | "date" | "time";
  placeholder?: string;
  autoComplete?: string;
  inputProps?: Omit<ComponentProps<typeof Input>, "id" | "value" | "onChange" | "onBlur" | "name">;
}

export function FormInput<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  type = "text",
  placeholder,
  autoComplete,
  inputProps,
  ...fieldProps
}: FormInputProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <Input
          {...field}
          {...inputProps}
          id={a11y.id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={fieldProps.disabled ?? field.disabled}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
          // A number input must yield a number, not a numeric string, or Zod's
          // `z.number()` rejects every value the user types.
          value={field.value ?? ""}
          onChange={(event) => {
            if (type === "number") {
              const raw = event.target.value;
              field.onChange(raw === "" ? undefined : Number(raw));
              return;
            }
            field.onChange(event.target.value);
          }}
        />
      )}
    </FormField>
  );
}

export interface FormTextareaProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  placeholder?: string;
  rows?: number;
}

export function FormTextarea<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ placeholder, rows = 4, ...fieldProps }: FormTextareaProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <Textarea
          {...field}
          id={a11y.id}
          rows={rows}
          placeholder={placeholder}
          disabled={fieldProps.disabled ?? field.disabled}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
          value={field.value ?? ""}
        />
      )}
    </FormField>
  );
}

// --- Select ----------------------------------------------------------------

export interface FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  options: readonly SelectOption[];
  placeholder?: string;
}

export function FormSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ options, placeholder = "Select…", ...fieldProps }: FormSelectProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <Select
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={fieldProps.disabled ?? field.disabled}
        >
          <SelectTrigger
            id={a11y.id}
            className="w-full"
            aria-invalid={a11y.invalid}
            aria-describedby={a11y.describedBy}
            onBlur={field.onBlur}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}

// --- Boolean ---------------------------------------------------------------

export function FormCheckbox<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(fieldProps: BaseFieldProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps} layout="inline">
      {(field, a11y) => (
        <Checkbox
          id={a11y.id}
          checked={Boolean(field.value)}
          onCheckedChange={(checked) => field.onChange(checked === true)}
          onBlur={field.onBlur}
          disabled={fieldProps.disabled ?? field.disabled}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
        />
      )}
    </FormField>
  );
}

export function FormSwitch<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>(
  fieldProps: BaseFieldProps<TFieldValues, TName>,
) {
  return (
    <FormField {...fieldProps} layout="inline">
      {(field, a11y) => (
        <Switch
          id={a11y.id}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
          onBlur={field.onBlur}
          disabled={fieldProps.disabled ?? field.disabled}
          aria-invalid={a11y.invalid}
          aria-describedby={a11y.describedBy}
        />
      )}
    </FormField>
  );
}

// --- Radio -----------------------------------------------------------------

export interface FormRadioGroupProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  options: readonly SelectOption[];
  orientation?: "vertical" | "horizontal";
}

export function FormRadioGroup<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({ options, orientation = "vertical", ...fieldProps }: FormRadioGroupProps<TFieldValues, TName>) {
  return (
    <FormField {...fieldProps}>
      {(field, a11y) => (
        <RadioGroup
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={fieldProps.disabled ?? field.disabled}
          aria-describedby={a11y.describedBy}
          aria-invalid={a11y.invalid}
          className={cn(orientation === "horizontal" && "flex flex-wrap gap-6")}
        >
          {options.map((option) => {
            const optionId = `${a11y.id}-${option.value}`;
            return (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroupItem value={option.value} id={optionId} disabled={option.disabled} />
                <Label htmlFor={optionId} className="font-normal">
                  {option.label}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      )}
    </FormField>
  );
}

// --- Layout helpers --------------------------------------------------------

/** Two-column responsive grid for form fields. */
export function FormGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-5",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A titled group of fields, for forms long enough to need signposting. */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h2 className="text-base font-medium">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Makes a field span the full width of a `FormGrid`. */
export function FormFullWidth({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2 lg:col-span-3">{children}</div>;
}
