"use client";

import type { FieldValues } from "react-hook-form";

import { FormShell } from "@/components/forms";

import { ResourceFormFields } from "./resource-form-fields";
import { useResourceForm } from "./use-resource-form";
import type { ResourceDefinition } from "./resource.types";

export interface ResourceFormProps<TEntity, TFormValues extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: ResourceDefinition<TEntity, any, any, any, TFormValues>;
  mode: "create" | "edit";
  entity?: TEntity;
  onSuccess?: (entity: TEntity) => void | false;
  redirectTo?: string;
  variant?: "card" | "plain";
}

/**
 * Renders a resource form in whichever mode the definition declares.
 *
 * Mode 2 (`component` / `createComponent` / `editComponent`) wins over Mode 1
 * (`fields`). Either way the lifecycle comes from `useResourceForm`, so the two
 * modes differ only in who renders the inputs.
 */
export function ResourceForm<TEntity, TFormValues extends FieldValues>({
  resource,
  mode,
  entity,
  onSuccess,
  redirectTo,
  variant = "card",
}: ResourceFormProps<TEntity, TFormValues>) {
  const config = resource.form;

  if (!config) {
    throw new Error(`Resource "${resource.key}" has no form configuration.`);
  }

  const formState = useResourceForm<TEntity, TFormValues>({
    resource,
    mode,
    entity,
    onSuccess,
    redirectTo,
  });

  const CustomComponent =
    (mode === "create" ? config.createComponent : config.editComponent) ?? config.component;

  if (CustomComponent) {
    return (
      <CustomComponent
        mode={mode}
        entity={entity}
        form={formState.form}
        handleSubmit={formState.handleSubmit}
        submit={formState.submit}
        submitting={formState.submitting}
        error={formState.error}
        onCancel={formState.onCancel}
        submitLabel={formState.submitLabel}
      />
    );
  }

  if (!config.fields) {
    throw new Error(
      `Resource "${resource.key}" form needs either \`fields\` (configuration) or \`component\` (custom).`,
    );
  }

  return (
    <FormShell
      form={formState.form}
      onSubmit={formState.handleSubmit}
      submitting={formState.submitting}
      submitLabel={formState.submitLabel}
      onCancel={formState.onCancel}
      variant={variant}
    >
      <ResourceFormFields
        form={formState.form}
        fields={config.fields}
        columns={config.columns}
        disabled={formState.submitting}
      />
    </FormShell>
  );
}
