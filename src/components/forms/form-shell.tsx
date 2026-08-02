"use client";

import type { FormEventHandler, ReactNode } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

import { LoadingButton } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { FormError } from "./form-error";

export interface FormShellProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
  submitting?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  /** Extra controls beside the submit button, e.g. "Save and add another". */
  secondaryActions?: ReactNode;
  disabled?: boolean;
  /** `card` for a page form, `plain` inside a dialog that already has a frame. */
  variant?: "card" | "plain";
  className?: string;
}

/**
 * The chrome around every form: error banner, body, footer buttons.
 *
 * Custom forms use this to inherit the standard layout and submit affordances
 * while owning their fields entirely — the escape hatch and the shared shell
 * are not mutually exclusive.
 */
export function FormShell<TFieldValues extends FieldValues>({
  form,
  onSubmit,
  children,
  submitting = false,
  submitLabel = "Save",
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
  onCancel,
  secondaryActions,
  disabled = false,
  variant = "card",
  className,
}: FormShellProps<TFieldValues>) {
  const body = (
    <>
      <FormError form={form} />
      {children}
    </>
  );

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {cancelLabel}
        </Button>
      ) : null}

      {secondaryActions}

      <LoadingButton
        type="submit"
        loading={submitting}
        loadingText={submittingLabel}
        disabled={disabled}
      >
        {submitLabel}
      </LoadingButton>
    </div>
  );

  return (
    <form
      onSubmit={onSubmit}
      // Browser validation would fire before Zod and show its own bubbles.
      noValidate
      className={cn("space-y-6", className)}
    >
      {variant === "card" ? (
        <Card>
          <CardContent className="space-y-6">{body}</CardContent>
          <CardFooter className="border-t">{footer}</CardFooter>
        </Card>
      ) : (
        <>
          <div className="space-y-6">{body}</div>
          {footer}
        </>
      )}
    </form>
  );
}
