"use client";

import type { FieldValues } from "react-hook-form";

import { ErrorState, ForbiddenState, NotFoundState } from "@/components/common/error-state";
import { FormLoading } from "@/components/common/loading";
import { PageHeader, type BreadcrumbEntry } from "@/components/common/page-header";
import { usePermission } from "@/lib/auth/auth-context";
import { isApiError } from "@/lib/errors";

import { ResourceForm } from "./resource-form";
import { useResourceDetail } from "./resource-query";
import type { ResourceDefinition, ResourceId } from "./resource.types";

export interface ResourceEditPageProps<TEntity, TFormValues extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: ResourceDefinition<TEntity, any, any, any, TFormValues>;
  id: ResourceId;
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
  redirectTo?: string;
}

/**
 * The edit engine.
 *
 * Owns: permission check, record loading, loading skeleton, 404 and error
 * states, mapping the record to form defaults, the mutation, backend error
 * mapping, success handling and navigation.
 *
 * None of that is reimplemented per module — the resource supplies only its
 * fields (or a custom form) and, if the record shape differs from the form
 * shape, a `toFormValues` mapper.
 */
export function ResourceEditPage<TEntity, TFormValues extends FieldValues>({
  resource,
  id,
  title,
  description,
  breadcrumbs,
  redirectTo,
}: ResourceEditPageProps<TEntity, TFormValues>) {
  const allowed = usePermission(resource.permissions.edit);
  const { data: entity, isPending, error, refetch } = useResourceDetail(resource, id);

  if (!resource.capabilities.edit) {
    throw new Error(`Resource "${resource.key}" does not support editing.`);
  }

  if (!allowed) {
    return (
      <ForbiddenState
        backHref={resource.routes.list}
        backLabel={`Back to ${resource.pluralName.toLowerCase()}`}
      />
    );
  }

  const label = entity ? resource.getLabel(entity) : undefined;

  const header = (
    <PageHeader
      title={title ?? (label ? `Edit ${label}` : `Edit ${resource.name.toLowerCase()}`)}
      description={description}
      breadcrumbs={
        breadcrumbs ?? [
          { label: resource.pluralName, href: resource.routes.list },
          ...(label && resource.routes.detail ? [{ label, href: resource.routes.detail(id) }] : []),
          { label: "Edit" },
        ]
      }
    />
  );

  if (isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {header}
        <FormLoading />
      </div>
    );
  }

  // A 404 is a distinct outcome from a failed request: it means the record is
  // gone, so offering "try again" would be misleading.
  if (error && isApiError(error) && error.isNotFound) {
    return (
      <NotFoundState
        title={`${resource.name} not found`}
        description={`This ${resource.name.toLowerCase()} does not exist, or has been deleted.`}
        backHref={resource.routes.list}
        backLabel={`Back to ${resource.pluralName.toLowerCase()}`}
      />
    );
  }

  if (error || !entity) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {header}
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {header}
      <ResourceForm resource={resource} mode="edit" entity={entity} redirectTo={redirectTo} />
    </div>
  );
}
