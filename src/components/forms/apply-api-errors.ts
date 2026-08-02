import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

import { getErrorMessage, isApiError, type ApiFieldError } from "@/lib/errors";

export interface ApplyApiErrorsOptions {
  /**
   * Field paths the form actually renders. Errors for anything else are
   * surfaced at form level instead of being attached to a control the user
   * cannot see — otherwise the form blocks submission with an invisible error.
   */
  knownFields?: readonly string[];
  /** Maps a backend path onto a form path when the two differ. */
  mapPath?: (path: string) => string | undefined;
  /** Moves focus to the first errored field. */
  shouldFocus?: boolean;
}

export interface ApplyApiErrorsResult {
  /** True when at least one error landed on a field or on the form root. */
  applied: boolean;
  /** Errors that matched no rendered field. Already shown at form level. */
  unmatched: ApiFieldError[];
}

/**
 * Moves backend validation errors into React Hook Form.
 *
 *   { errors: [{ path: "email", message: "Email already exists" }] }
 *
 * becomes `form.setError("email", { message: "Email already exists" })`, and
 * anything without a matching field becomes a form-level `root.serverError`.
 *
 * Every create/edit flow in the app routes failures through this, which is why
 * no individual form contains error-mapping code.
 */
export function applyApiErrorsToForm<TFieldValues extends FieldValues>(
  error: unknown,
  form: UseFormReturn<TFieldValues>,
  options: ApplyApiErrorsOptions = {},
): ApplyApiErrorsResult {
  const { knownFields, mapPath, shouldFocus = true } = options;

  if (!isApiError(error)) {
    setFormError(form, getErrorMessage(error));
    return { applied: true, unmatched: [] };
  }

  const unmatched: ApiFieldError[] = [];
  let focused = false;

  for (const fieldError of error.errors) {
    const path = normalizePath(mapPath?.(fieldError.path) ?? fieldError.path);

    const isKnown = knownFields ? knownFields.includes(path) : true;

    if (!isKnown) {
      unmatched.push(fieldError);
      continue;
    }

    form.setError(
      path as Path<TFieldValues>,
      { type: "server", message: fieldError.message },
      { shouldFocus: shouldFocus && !focused },
    );

    focused = true;
  }

  const applied = error.errors.length > unmatched.length;

  // Show a form-level message when nothing landed on a field, or when some
  // errors could not be placed. Without this a failed submit would look like
  // nothing happened.
  if (!applied || unmatched.length > 0) {
    const message =
      unmatched.length > 0 && applied
        ? unmatched.map((entry) => `${entry.path}: ${entry.message}`).join(" ")
        : getErrorMessage(error);

    setFormError(form, message);
  }

  return { applied: true, unmatched };
}

/** Sets the form-level error read by `<FormError />`. */
export function setFormError<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  message: string,
): void {
  form.setError("root.serverError", { type: "server", message });
}

/** Clears the form-level error, typically before a retry. */
export function clearFormError<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
): void {
  form.clearErrors("root.serverError");
}

/**
 * Converts a backend path to React Hook Form's dot notation.
 *
 *   "address.city"       → "address.city"
 *   "contacts[0].phone"  → "contacts.0.phone"
 *   "body.email"         → "email"          (strips a request-body prefix)
 */
export function normalizePath(path: string): string {
  return path
    .replace(/^(body|data|payload|input)\./, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^\./, "");
}

/**
 * Collects the field paths a Zod object schema defines, for `knownFields`.
 *
 * Only the top level plus one nested level, which covers the shapes forms
 * actually use and keeps this from becoming a schema walker.
 */
export function fieldPathsFromShape(shape: Record<string, unknown>): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    paths.push(key);

    const nested = (value as { shape?: Record<string, unknown> })?.shape;
    if (nested && typeof nested === "object") {
      for (const nestedKey of Object.keys(nested)) {
        paths.push(`${key}.${nestedKey}`);
      }
    }
  }

  return paths;
}
