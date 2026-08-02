"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

/**
 * Route-level error boundary.
 *
 * Catches render and data errors below it, keeping the shell and navigation
 * usable. `reset` retries the segment without a full page reload.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with your reporter, e.g. Sentry.captureException(error).
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full">
        <AlertTriangleIcon className="size-6" />
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-medium">Something went wrong</h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm text-balance">
          {getErrorMessage(error)}
        </p>
        {error.digest ? (
          <p className="text-muted-foreground/70 pt-1 font-mono text-xs">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>

      <Button variant="outline" onClick={reset}>
        <RefreshCwIcon />
        Try again
      </Button>
    </div>
  );
}
