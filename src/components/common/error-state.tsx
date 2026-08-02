"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  FileQuestionIcon,
  LockIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getErrorMessage, getErrorReference, getErrorTitle, isApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  error: unknown;
  /** Wired to a query's `refetch`, or a router refresh. */
  onRetry?: () => void;
  title?: string;
  description?: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

/**
 * Full-block error display for a failed page or panel.
 *
 * Reads the message through `getErrorMessage` so a 500 never renders a stack
 * trace, and shows the request id when the backend supplied one — that is the
 * single most useful thing a user can quote to support.
 */
export function ErrorState({
  error,
  onRetry,
  title,
  description,
  className,
  size = "md",
}: ErrorStateProps) {
  const Icon = isApiError(error) && error.isNetworkError ? WifiOffIcon : AlertCircleIcon;
  const reference = getErrorReference(error);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "md" ? "gap-4 px-6 py-16" : "gap-3 px-4 py-10",
        className,
      )}
    >
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <Icon className="size-6" />
      </div>

      <div className="space-y-1">
        <p className="text-base font-medium">{title ?? getErrorTitle(error)}</p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm text-balance">
          {description ?? getErrorMessage(error)}
        </p>
        {reference ? (
          <p className="text-muted-foreground/70 pt-1 font-mono text-xs">{reference}</p>
        ) : null}
      </div>

      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Compact inline error, for a failed section inside an otherwise working page
 * (a lookup dropdown that could not load its options, for example).
 */
export function InlineError({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircleIcon />
      <AlertTitle>{getErrorTitle(error)}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>{getErrorMessage(error)}</span>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCwIcon />
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function NotFoundState({
  title = "Not found",
  description = "The record you are looking for does not exist, or has been removed.",
  backHref,
  backLabel = "Go back",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <FileQuestionIcon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm text-balance">{description}</p>
      </div>
      {backHref ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function ForbiddenState({
  title = "You do not have access",
  description = "You do not have permission to view this. Contact an administrator if you think this is a mistake.",
  backHref = "/",
  backLabel = "Back to dashboard",
}: {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <LockIcon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto max-w-md text-sm text-balance">{description}</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
