"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import type { z } from "zod";

import { applyApiErrorsToForm, clearFormError } from "@/components/forms";

import { useCreateResource, useUpdateResource } from "./resource-query";
import type { ResourceDefinition, ResourceId } from "./resource.types";

/**
 * Builds the RHF resolver for a form schema.
 *
 * Zod 4 tracks a schema's input and output types separately, and the resolver
 * overloads require them to line up. A form schema parses form values into form
 * values, so the two coincide here — TypeScript just cannot prove it through
 * the generic, hence the cast in this one place rather than at every call site.
 */
function formResolver<TFormValues extends FieldValues>(
  schema: z.ZodType<TFormValues>,
): Resolver<TFormValues> {
  return zodResolver(
    schema as unknown as z.ZodType<TFormValues, TFormValues>,
  ) as unknown as Resolver<TFormValues>;
}

export interface UseResourceFormOptions<TEntity, TFormValues extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: ResourceDefinition<TEntity, any, any, any, TFormValues>;
  mode: "create" | "edit";
  /** The loaded record. Required in edit mode. */
  entity?: TEntity;
  /** Overrides the default redirect. Return `false` to stay on the page. */
  onSuccess?: (entity: TEntity) => void | false;
  /** Where to go after a successful save. Defaults to detail, else list. */
  redirectTo?: string;
}

export interface UseResourceFormResult<TFormValues extends FieldValues> {
  form: UseFormReturn<TFormValues>;
  handleSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  submit: (values: TFormValues) => Promise<void>;
  submitting: boolean;
  error: unknown;
  onCancel: () => void;
  submitLabel: string;
}

/**
 * Wires a form to a resource's create/update mutation.
 *
 * This is the single implementation of the submit lifecycle:
 *
 *   validate → map to request body → call the API → on failure map backend
 *   field errors onto the form → on success toast, invalidate caches, redirect
 *
 * Both the configuration-driven form and any custom form component run through
 * it, which is why a hand-written multi-step form still gets server-error
 * mapping and cache invalidation without reimplementing either.
 */
export function useResourceForm<TEntity, TFormValues extends FieldValues>({
  resource,
  mode,
  entity,
  onSuccess,
  redirectTo,
}: UseResourceFormOptions<TEntity, TFormValues>): UseResourceFormResult<TFormValues> {
  const router = useRouter();
  const config = resource.form;

  if (!config) {
    throw new Error(
      `Resource "${resource.key}" has no form configuration. Add \`form\` to its definition, or build a custom page.`,
    );
  }

  const schema = (mode === "create" ? config.createSchema : config.editSchema) ?? config.schema;

  const defaultValues: DefaultValues<TFormValues> =
    mode === "edit" && entity
      ? (config.toFormValues?.(entity) ?? (entity as unknown as DefaultValues<TFormValues>))
      : config.defaultValues;

  const form = useForm<TFormValues>({
    resolver: formResolver(schema),
    defaultValues,
    // Validate on blur first, then on every change once a field has errored —
    // less noisy than `onChange` while still giving live feedback during a fix.
    mode: "onTouched",
  });

  const createMutation = useCreateResource(resource);
  const updateMutation = useUpdateResource(resource);
  const [error, setError] = useState<unknown>(null);

  const submit = useCallback(
    async (values: TFormValues) => {
      setError(null);
      clearFormError(form);

      try {
        let saved: TEntity;

        if (mode === "create") {
          const input = config.toCreateInput?.(values) ?? (values as unknown);
          saved = await createMutation.mutateAsync(input);
          toast.success(resource.messages?.created?.(saved) ?? `${resource.name} created`);
        } else {
          if (!entity) throw new Error("Cannot save: the record has not loaded yet.");

          const id: ResourceId = resource.getId(entity);
          const input = config.toUpdateInput?.(values, entity) ?? (values as unknown);
          saved = await updateMutation.mutateAsync({ id, data: input });
          toast.success(resource.messages?.updated?.(saved) ?? `${resource.name} updated`);
        }

        if (onSuccess?.(saved) === false) return;

        const target =
          redirectTo ?? resource.routes.detail?.(resource.getId(saved)) ?? resource.routes.list;

        router.push(target);
        // Server Components on the destination re-render with fresh data.
        router.refresh();
      } catch (submitError) {
        setError(submitError);

        // Field errors land next to their inputs; anything unmatched becomes a
        // form-level message. Nothing here is toasted — see FormError.
        applyApiErrorsToForm(submitError, form);
      }
    },
    [
      mode,
      entity,
      config,
      resource,
      createMutation,
      updateMutation,
      onSuccess,
      redirectTo,
      router,
      form,
    ],
  );

  const handleSubmit = form.handleSubmit(submit);

  const onCancel = useCallback(() => {
    const fallback =
      mode === "edit" && entity
        ? (resource.routes.detail?.(resource.getId(entity)) ?? resource.routes.list)
        : resource.routes.list;

    router.push(fallback);
  }, [mode, entity, resource, router]);

  return {
    form,
    handleSubmit,
    submit,
    submitting: form.formState.isSubmitting || createMutation.isPending || updateMutation.isPending,
    error,
    onCancel,
    submitLabel: mode === "create" ? `Create ${resource.name.toLowerCase()}` : "Save changes",
  };
}
