import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Semantic tones shared by every status in the app. Features map their own
 * business statuses onto these — the tone vocabulary is shared, the mapping is
 * not, because `ACTIVE` means different things in different modules.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "muted" | "neutral";

const TONE_CLASSES: Record<StatusTone, string> = {
  success:
    "border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-400",
  warning:
    "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:text-amber-400",
  danger: "border-red-600/20 bg-red-500/10 text-red-700 dark:border-red-400/20 dark:text-red-400",
  info: "border-sky-600/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:text-sky-400",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-transparent text-foreground",
};

/**
 * A status → tone (and optional label) mapping owned by a feature.
 *
 *   export const providerStatusMap = {
 *     ACTIVE:   { tone: "success", label: "Active" },
 *     INACTIVE: { tone: "muted" },
 *   } satisfies StatusMap<ProviderStatus>;
 */
export type StatusMap<TStatus extends string> = Record<
  TStatus,
  { tone: StatusTone; label?: string }
>;

export interface StatusBadgeProps<TStatus extends string> extends Omit<
  ComponentProps<typeof Badge>,
  "variant" | "children"
> {
  status: TStatus;
  map: StatusMap<TStatus>;
  /** Small coloured dot before the label. */
  withDot?: boolean;
}

/**
 * Renders a business status with consistent colour and casing.
 *
 * An unmapped status falls back to `neutral` with a humanised label rather than
 * throwing — a new enum value from the backend should look slightly plain, not
 * crash a table of 50 rows.
 */
export function StatusBadge<TStatus extends string>({
  status,
  map,
  withDot = false,
  className,
  ...props
}: StatusBadgeProps<TStatus>) {
  const entry = map[status];
  const tone = entry?.tone ?? "neutral";
  const label = entry?.label ?? humanize(status);

  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", TONE_CLASSES[tone], className)}
      {...props}
    >
      {withDot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {label}
    </Badge>
  );
}

/** `PENDING_REVIEW` → `Pending review` */
export function humanize(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
