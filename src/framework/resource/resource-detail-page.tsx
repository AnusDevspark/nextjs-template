"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PencilIcon } from "lucide-react";

import { ErrorState, ForbiddenState, NotFoundState } from "@/components/common/error-state";
import { DetailLoading } from "@/components/common/loading";
import { PageHeader, type BreadcrumbEntry } from "@/components/common/page-header";
import { PermissionGuard } from "@/components/common/permission-guard";
import { DetailView } from "@/components/detail-view";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/lib/auth/auth-context";
import { isApiError } from "@/lib/errors";

import { ResourceRowActions } from "./resource-actions";
import { useResourceDetail } from "./resource-query";
import type { ResourceDefinition, ResourceId } from "./resource.types";

export interface ResourceDetailPageProps<TEntity> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: ResourceDefinition<TEntity, any, any, any, any>;
  id: ResourceId;
  title?: string;
  breadcrumbs?: BreadcrumbEntry[];
  /** Extra buttons beside Edit and the actions menu. */
  headerActions?: ReactNode;
}

/**
 * The detail engine.
 *
 * Owns: permission check, loading, 404 and error states, page header,
 * breadcrumbs (titled with `getLabel`), the edit button and the actions menu —
 * including delete-then-return-to-list.
 *
 * The resource owns the content: either `details.sections` for the standard
 * label/value layout, or `details.component` for anything else.
 */
export function ResourceDetailPage<TEntity>({
  resource,
  id,
  title,
  breadcrumbs,
  headerActions,
}: ResourceDetailPageProps<TEntity>) {
  const allowed = usePermission(resource.permissions.view);
  const { data: entity, isPending, error, refetch } = useResourceDetail(resource, id);

  if (!allowed) {
    return (
      <ForbiddenState
        backHref={resource.routes.list}
        backLabel={`Back to ${resource.pluralName.toLowerCase()}`}
      />
    );
  }

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`${resource.name} details`}
          breadcrumbs={[{ label: resource.pluralName, href: resource.routes.list }, { label: "…" }]}
        />
        <DetailLoading />
      </div>
    );
  }

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
      <div className="space-y-6">
        <PageHeader
          title={`${resource.name} details`}
          breadcrumbs={[{ label: resource.pluralName, href: resource.routes.list }]}
        />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const label = resource.getLabel(entity);
  const edit = resource.capabilities.edit ? resource.routes.edit?.(id) : undefined;
  const CustomDetails = resource.details?.component;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title ?? label}
        breadcrumbs={
          breadcrumbs ?? [{ label: resource.pluralName, href: resource.routes.list }, { label }]
        }
        actions={
          <>
            {headerActions}

            {edit ? (
              <PermissionGuard permission={resource.permissions.edit}>
                <Button variant="outline" asChild>
                  <Link href={edit}>
                    <PencilIcon />
                    Edit
                  </Link>
                </Button>
              </PermissionGuard>
            ) : null}

            <ResourceRowActions
              resource={resource}
              entity={entity}
              onChanged={() => void refetch()}
              redirectAfterDelete={resource.routes.list}
            />
          </>
        }
      />

      {CustomDetails ? (
        <CustomDetails entity={entity} refetch={() => void refetch()} />
      ) : resource.details?.sections ? (
        <DetailView entity={entity} sections={resource.details.sections} />
      ) : (
        <p className="text-muted-foreground text-sm">
          This resource has no detail configuration. Add `details.sections` or `details.component`.
        </p>
      )}
    </div>
  );
}
