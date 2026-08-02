"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EyeIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";

import { useConfirm } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { getErrorMessage, shouldToastError } from "@/lib/errors";
import { cn } from "@/lib/utils";

import { detailHref, editHref, getStandardActions } from "./define-resource";
import { useDeleteResource } from "./resource-query";
import type { ResourceCustomAction, ResourceDefinition } from "./resource.types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyResourceOf<TEntity> = ResourceDefinition<TEntity, any, any, any, any>;

export interface ResourceRowActionsProps<TEntity> {
  resource: AnyResourceOf<TEntity>;
  entity: TEntity;
  /** Refetches the list after a destructive action. */
  onChanged?: () => void;
  /** Where to go after deleting from a detail page. Defaults to staying put. */
  redirectAfterDelete?: string;
}

/**
 * The row-actions menu.
 *
 * Standard actions (view / edit / delete) are generated from the resource's
 * routes, permissions and capabilities — no module writes them. Custom actions
 * are appended and get the same permission filtering and confirmation handling.
 */
export function ResourceRowActions<TEntity>({
  resource,
  entity,
  onChanged,
  redirectAfterDelete,
}: ResourceRowActionsProps<TEntity>) {
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = useAuth();
  const [runningKey, setRunningKey] = useState<string | null>(null);

  const deleteMutation = useDeleteResource(resource);

  const id = resource.getId(entity);
  const label = resource.getLabel(entity);

  const standard = getStandardActions(resource);
  const view = standard.includes("view") ? detailHref(resource, id) : undefined;
  const edit = standard.includes("edit") ? editHref(resource, id) : undefined;

  const canView = Boolean(view) && can(resource.permissions.view);
  const canEdit = Boolean(edit) && can(resource.permissions.edit);
  const canDelete = standard.includes("delete") && can(resource.permissions.delete);

  const customActions = (resource.actions?.custom ?? []).filter(
    (action) => (action.visible?.(entity) ?? true) && can(action.permission),
  );

  const hasAnything = canView || canEdit || canDelete || customActions.length > 0;
  if (!hasAnything) return null;

  async function handleDelete() {
    const confirmed = await confirm({
      title: `Delete ${resource.name.toLowerCase()}?`,
      description: `“${label}” will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success(resource.messages?.deleted?.(label) ?? `${resource.name} deleted`);

      if (redirectAfterDelete) router.push(redirectAfterDelete);
      onChanged?.();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleCustom(action: ResourceCustomAction<TEntity>) {
    if (action.href) {
      router.push(action.href(entity));
      return;
    }
    if (!action.onClick) return;

    if (action.confirm) {
      const options =
        typeof action.confirm === "function" ? action.confirm(entity) : action.confirm;
      const confirmed = await confirm(options);
      if (!confirmed) return;
    }

    setRunningKey(action.key);
    try {
      await action.onClick(entity, {
        refresh: () => onChanged?.(),
        navigate: (href) => router.push(href),
      });
    } catch (error) {
      if (shouldToastError(error)) toast.error(getErrorMessage(error));
    } finally {
      setRunningKey(null);
    }
  }

  const busy = deleteMutation.isPending || runningKey !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={busy}
          aria-label={`Actions for ${label}`}
        >
          {busy ? <Loader2Icon className="animate-spin" /> : <MoreHorizontalIcon />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        {canView && view ? (
          <DropdownMenuItem onSelect={() => router.push(view)}>
            <EyeIcon />
            View details
          </DropdownMenuItem>
        ) : null}

        {canEdit && edit ? (
          <DropdownMenuItem onSelect={() => router.push(edit)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
        ) : null}

        {customActions.map((action) => {
          const disabled = action.disabled?.(entity);
          const actionLabel =
            typeof action.label === "function" ? action.label(entity) : action.label;
          const Icon = action.icon;

          return (
            <div key={action.key}>
              {action.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={Boolean(disabled)}
                title={typeof disabled === "string" ? disabled : undefined}
                variant={action.variant === "destructive" ? "destructive" : "default"}
                onSelect={() => void handleCustom(action)}
              >
                {Icon ? <Icon /> : null}
                {actionLabel}
              </DropdownMenuItem>
            </div>
          );
        })}

        {canDelete ? (
          <>
            {canView || canEdit || customActions.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem variant="destructive" onSelect={() => void handleDelete()}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Builds the trailing actions column for a resource table.
 *
 * Kept separate from `column-helpers` because it needs the resource definition,
 * which is framework knowledge rather than table knowledge.
 */
export function createResourceActionsColumn<TEntity>(
  resource: AnyResourceOf<TEntity>,
  onChanged: () => void,
) {
  return {
    id: "actions",
    header: "",
    size: 56,
    enableHiding: false,
    meta: { align: "right" as const, label: "Actions" },
    cell: ({ row }: { row: { original: TEntity } }) => (
      <div className={cn("flex justify-end")}>
        <ResourceRowActions resource={resource} entity={row.original} onChanged={onChanged} />
      </div>
    ),
  };
}
