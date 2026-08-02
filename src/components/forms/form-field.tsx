"use client";

import { useId, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The ids a control needs to be announced correctly by a screen reader.
 * Generated once here so no field component has to remember the wiring.
 */
export interface FieldA11y {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
}

export interface BaseFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: ReactNode;
  /** Hint shown under the control. Hidden once an error replaces it. */
  description?: ReactNode;
  /** Renders the required marker. Actual enforcement stays in the Zod schema. */
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

interface FormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends BaseFieldProps<TFieldValues, TName> {
  children: (field: ControllerRenderProps<TFieldValues, TName>, a11y: FieldA11y) => ReactNode;
  /** Checkbox and switch put the label beside the control, not above it. */
  layout?: "stacked" | "inline";
}

/**
 * The single place field accessibility is implemented.
 *
 * Every `Form*` component below renders through this, so all of them get a
 * `<label for>` association, `aria-describedby` pointing at the description and
 * the error, `aria-invalid`, and `role="alert"` on the message — without
 * repeating any of it. Custom fields can use it directly via its render prop.
 */
export function FormField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  control,
  name,
  label,
  description,
  required,
  className,
  children,
  layout = "stacked",
}: FormFieldProps<TFieldValues, TName>) {
  const reactId = useId();
  const id = `${name}-${reactId}`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;
        const invalid = Boolean(fieldState.error);

        const describedBy =
          [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ") ||
          undefined;

        const control_ = children(field, { id, describedBy, invalid });

        if (layout === "inline") {
          return (
            <div className={cn("space-y-2", className)}>
              <div className="flex items-start gap-3">
                {control_}
                <div className="space-y-1 leading-none">
                  {label ? (
                    <Label htmlFor={id} className="font-normal">
                      {label}
                      {required ? <RequiredMark /> : null}
                    </Label>
                  ) : null}
                  {description ? (
                    <p id={descriptionId} className="text-muted-foreground text-xs">
                      {description}
                    </p>
                  ) : null}
                </div>
              </div>
              {error ? <FieldMessage id={errorId}>{error}</FieldMessage> : null}
            </div>
          );
        }

        return (
          <div className={cn("space-y-2", className)}>
            {label ? (
              <Label htmlFor={id}>
                {label}
                {required ? <RequiredMark /> : null}
              </Label>
            ) : null}

            {control_}

            {description && !error ? (
              <p id={descriptionId} className="text-muted-foreground text-xs">
                {description}
              </p>
            ) : null}

            {error ? <FieldMessage id={errorId}>{error}</FieldMessage> : null}
          </div>
        );
      }}
    />
  );
}

function RequiredMark() {
  return (
    <span className="text-destructive ml-0.5" aria-hidden>
      *
    </span>
  );
}

export function FieldMessage({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="text-destructive text-xs font-medium">
      {children}
    </p>
  );
}
