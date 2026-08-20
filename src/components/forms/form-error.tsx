"use client";

import type { FieldValues, UseFormReturn } from "react-hook-form";
import { AlertCircleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Form-level error banner.
 *
 * Displays the `root.serverError` set by `applyApiErrorsToForm` — the failures
 * that belong to the submission as a whole ("This invoice conflicts with an
 * existing record") rather than to one input.
 *
 * These are shown here rather than in a toast: a toast disappears while the
 * user is still reading the form it refers to.
 */
export function FormError<TFieldValues extends FieldValues>({
  form,
  title = "Could not save",
}: {
  form: UseFormReturn<TFieldValues>;
  title?: string;
}) {
  const message = form.formState.errors.root?.serverError?.message;

  if (!message) return null;

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
