"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { DownloadIcon, PlusIcon } from "lucide-react";

import { PageHeader, type BreadcrumbEntry } from "@/components/common/page-header";
import { PermissionGuard } from "@/components/common/permission-guard";
import { DataTable, createSelectColumn } from "@/components/data-table";
import { LoadingButton } from "@/components/common/loading";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadFile, timestampedFilename } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useListQueryState } from "@/hooks/use-list-query-state";
import type { BaseListQuery } from "@/lib/query/list-query";

import { getListQueryConfig } from "./define-resource";
import { createResourceActionsColumn } from "./resource-actions";
import { useResourceList } from "./resource-query";
import type { ResourceDefinition } from "./resource.types";

export interface ResourceListPageProps<TEntity, TQuery extends BaseListQuery> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resource: ResourceDefinition<TEntity, any, any, TQuery, any>;
  title?: string;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbEntry[];
  /** Extra buttons beside the create button. */
  headerActions?: ReactNode;
}

/**
 * The listing engine.
 *
 * Owns: page header, permission-gated create button, URL state (page, size,
 * search, sort, filters), data fetching, loading, empty and error presentation,
 * pagination, row actions, delete confirmation, cache invalidation and export.
 *
 * The resource owns: columns, filters, default sort, custom actions.
 *
 * A typical page is therefore:
 *
 *   export default async function ProvidersPage() {
 *     await requirePermission(PERMISSIONS.provider.view);
 *     return <ResourceListPage resource={providerResource} />;
 *   }
 */
export function ResourceListPage<TEntity, TQuery extends BaseListQuery>({
  resource,
  title,
  description,
  breadcrumbs,
  headerActions,
}: ResourceListPageProps<TEntity, TQuery>) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);

  const queryConfig = useMemo(() => getListQueryConfig(resource), [resource]);
  const state = useListQueryState(queryConfig);
  const query = state.query as unknown as TQuery;

  const { data, isPending, isFetching, error, refetch } = useResourceList(resource, query);

  const items = data?.items ?? [];
  const meta = data?.meta ?? {
    page: state.query.page,
    pageSize: state.query.pageSize,
    total: 0,
    totalPages: 1,
  };

  /**
   * Columns as configured, plus the framework's own: a selection checkbox when
   * enabled, and the trailing actions menu.
   */
  const columns = useMemo<ColumnDef<TEntity, unknown>[]>(() => {
    const result: ColumnDef<TEntity, unknown>[] = [];

    if (resource.list.enableRowSelection) result.push(createSelectColumn<TEntity>());
    result.push(...resource.list.columns);
    result.push(
      createResourceActionsColumn(resource, () => void refetch()) as ColumnDef<TEntity, unknown>,
    );

    return result;
  }, [resource, refetch]);

  const rowHref =
    resource.list.rowHref ??
    (resource.capabilities.detail && resource.routes.detail
      ? (entity: TEntity) => resource.routes.detail!(resource.getId(entity))
      : undefined);

  async function handleExport(format: string) {
    if (!resource.export) return;

    setExporting(true);
    try {
      await downloadFile(resource.export.path, {
        query: {
          ...(resource.export.buildQuery?.(query, format) ?? {}),
          format,
        },
        filename: timestampedFilename(resource.export.filenameBase ?? resource.key, format),
      });
    } catch (exportError) {
      toast.error(getErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  }

  const ToolbarActions = resource.list.toolbarActions;
  const CustomList = resource.list.component;

  const exportFormats = resource.export?.formats ?? ["csv"];

  return (
    <div className="space-y-6">
      <PageHeader
        title={title ?? resource.pluralName}
        description={description ?? resource.description}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            {headerActions}

            {resource.capabilities.create && resource.routes.create ? (
              <PermissionGuard permission={resource.permissions.create}>
                <Button asChild>
                  <Link href={resource.routes.create}>
                    <PlusIcon />
                    New {resource.name.toLowerCase()}
                  </Link>
                </Button>
              </PermissionGuard>
            ) : null}
          </>
        }
      />

      {CustomList ? (
        <CustomList
          items={items}
          meta={meta}
          isLoading={isPending}
          isFetching={isFetching}
          error={error}
          refetch={() => void refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={items}
          page={meta.page}
          pageSize={meta.pageSize}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={state.setPage}
          onPageSizeChange={state.setPageSize}
          sortBy={state.query.sortBy}
          sortOrder={state.query.sortOrder}
          onToggleSort={state.toggleSort}
          search={state.query.search ?? ""}
          onSearchChange={state.setSearch}
          searchPlaceholder={
            resource.list.searchPlaceholder ?? `Search ${resource.pluralName.toLowerCase()}…`
          }
          filters={resource.list.filters}
          filterValues={state.filters}
          setFilter={state.setFilter}
          clearFilters={state.clearFilters}
          hasActiveFilters={state.hasActiveFilters}
          isLoading={isPending}
          isFetching={isFetching || state.isPending}
          error={error}
          onRetry={() => void refetch()}
          entityName={resource.pluralName.toLowerCase()}
          emptyState={resource.list.emptyState}
          getRowId={(entity) => String(resource.getId(entity))}
          enableRowSelection={resource.list.enableRowSelection}
          onRowClick={rowHref ? (entity) => router.push(rowHref(entity)) : undefined}
          mobileRenderer={resource.list.mobileRenderer}
          toolbarActions={
            <>
              {ToolbarActions ? <ToolbarActions query={query} /> : null}

              {resource.capabilities.export && resource.export ? (
                <PermissionGuard permission={resource.permissions.export}>
                  {exportFormats.length === 1 ? (
                    <LoadingButton
                      variant="outline"
                      size="sm"
                      loading={exporting}
                      onClick={() => void handleExport(exportFormats[0]!)}
                    >
                      <DownloadIcon />
                      Export
                    </LoadingButton>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <LoadingButton variant="outline" size="sm" loading={exporting}>
                          <DownloadIcon />
                          Export
                        </LoadingButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {exportFormats.map((format) => (
                          <DropdownMenuItem key={format} onSelect={() => void handleExport(format)}>
                            Export as {format.toUpperCase()}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </PermissionGuard>
              ) : null}
            </>
          }
        />
      )}
    </div>
  );
}
