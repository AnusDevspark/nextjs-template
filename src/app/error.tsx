"use client";

import { useEffect, useState } from "react";
import { AlertTriangleIcon, LogOutIcon, RefreshCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";

/**
 * Root error boundary.
 *
 * This is the boundary that catches a throw from the dashboard *layout* — a
 * segment's own `error.tsx` sits below its layout and never sees one. In
 * practice that means it is where a failed session lookup lands, so it offers a
 * sign-out alongside the retry: if the API cannot resolve the cookie the
 * browser is holding, retrying will fail forever and the only way forward is to
 * drop it. Without that button the escape is "open devtools and clear cookies",
 * which is not a thing a user can be asked to do.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    // Replace with your reporter, e.g. Sentry.captureException(error).
    console.error("Route error:", error);
  }, [error]);

  async function signOut() {
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // The route clears the cookies even when the backend call fails, and a
      // full document load below re-reads them either way.
    }

    // Not `router.replace`: the tree that failed to render is still mounted,
    // and a soft navigation would try to reuse it.
    window.location.href = "/login";
  }

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

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={reset} disabled={isSigningOut}>
          <RefreshCwIcon />
          Try again
        </Button>

        <Button variant="ghost" onClick={signOut} disabled={isSigningOut}>
          <LogOutIcon />
          Sign out
        </Button>
      </div>
    </div>
  );
}
