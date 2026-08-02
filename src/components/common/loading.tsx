import type { ComponentProps, ReactNode } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading primitives.
 *
 * The rule this file encodes: match the shape of what is loading. A skeleton
 * that mirrors the final layout avoids the content jump a centred spinner
 * causes, so spinners are reserved for buttons and short inline waits.
 */

export interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  /** Replaces the label while pending, e.g. "Saving…". */
  loadingText?: string;
}

/**
 * A button that shows progress without changing width.
 *
 * `aria-busy` and the disabled state are set together, so assistive technology
 * announces the wait and a double submit is impossible.
 */
export function LoadingButton({
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}

/** Centred spinner for short waits inside an already-rendered container. */
export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center", className)}>
      <Loader2Icon className="text-muted-foreground size-4 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Page-level fallback for `loading.tsx` and Suspense boundaries. */
export function PageLoading({ label = "Loading page" }: { label?: string }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label={label}>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Skeleton shaped like a `DetailView`: sections of label/value pairs. */
export function DetailLoading({
  sections = 2,
  fields = 4,
}: {
  sections?: number;
  fields?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading details">
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <Card key={sectionIndex}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {Array.from({ length: fields }).map((_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Skeleton shaped like a form: stacked label/input pairs plus a footer. */
export function FormLoading({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading form">
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

/** Wraps content that is refreshing in place, dimming it without unmounting. */
export function RefreshingOverlay({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      <div
        className={cn("transition-opacity", active && "pointer-events-none opacity-60")}
        aria-busy={active}
      >
        {children}
      </div>
    </div>
  );
}
