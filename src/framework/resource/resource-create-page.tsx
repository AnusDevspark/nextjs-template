"use client";

import type { FieldValues } from "react-hook-form";

import { PageHeader, type BreadcrumbEntry } from "@/components/common/page-header";
import { ForbiddenState } from "@/components/common/error-state";
import { usePermission } from "@/lib/auth/auth-context";
import type { BaseListQuery } from "@/lib/query/list-query";

import { ResourceForm } from "./resource-form";
import type { ResourceDefinition } from "./resource.types";

export interface ResourceCreatePageProps<TEntity, TFormValues extends FieldValues> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: ResourceDefinition<TEntity, any, any, BaseListQuery, TFormValues>;
  title?: string;
  description?: string;
  breadcrumbs?: BreadcrumbEntry[];
  /** Overrides the redirect after a successful create. */
  redirectTo?: string;
}

/**
 * The create engine.
 *
 * Owns: permission check, page header, breadcrumbs, form shell, mutation,
 * backend error mapping, success toast, cache invalidation and redirect.
 *
 * The resource owns: the fields, or the whole form component.
 */
export function ResourceCreatePage<TEntity, TFormValues extends FieldValues>({
  resource,
  title,
  description,
  breadcrumbs,
  redirectTo,
}: ResourceCreatePageProps<TEntity, TFormValues>) {
  const allowed = usePermission(resource.permissions.create);

  if (!resource.capabilities.create) {
    throw new Error(`Resource "${resource.key}" does not support create.`);
  }

  // The server guard in `page.tsx` already redirected unauthorised users; this
  // covers a client-side navigation into the route.
  if (!allowed) {
    return (
      <ForbiddenState
        backHref={resource.routes.list}
        backLabel={`Back to ${resource.pluralName.toLowerCase()}`}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title={title ?? `New ${resource.name.toLowerCase()}`}
        description={description ?? `Add a new ${resource.name.toLowerCase()}.`}
        breadcrumbs={
          breadcrumbs ?? [
            { label: resource.pluralName, href: resource.routes.list },
            { label: "New" },
          ]
        }
      />

      <ResourceForm resource={resource} mode="create" redirectTo={redirectTo} />
    </div>
  );
}
