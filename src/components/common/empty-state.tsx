import type { ComponentType, ReactNode } from "react";
import { InboxIcon, SearchXIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  /** Typically a "Create …" button, or "Clear filters". */
  action?: ReactNode;
  className?: string;
  /** `sm` fits inside a table body; `md` suits a full page. */
  size?: "sm" | "md";
}

/**
 * Shown when a list has nothing to display.
 *
 * "No records yet" and "no records match your filters" need different wording
 * and different actions — `FilteredEmptyState` below covers the second case, so
 * features are not tempted to render a misleading "Create your first…" prompt
 * to someone who simply typed a bad search term.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "gap-4 px-6 py-16" : "gap-3 px-4 py-10",
        className,
      )}
    >
      <div
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center rounded-full",
          size === "md" ? "size-12" : "size-10",
        )}
      >
        <Icon className={size === "md" ? "size-6" : "size-5"} />
      </div>

      <div className="space-y-1">
        <p className={cn("font-medium", size === "md" ? "text-base" : "text-sm")}>{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto max-w-sm text-sm text-balance">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

/** Empty state for "your filters matched nothing", with a reset affordance. */
export function FilteredEmptyState({
  entityName,
  onReset,
  className,
}: {
  entityName: string;
  onReset?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      size="sm"
      icon={SearchXIcon}
      title={`No ${entityName} match your filters`}
      description="Try a different search term, or clear the filters to see everything."
      action={onReset}
      className={className}
    />
  );
}
