"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

import { ConfirmProvider } from "@/components/common/confirm-dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/query/query-provider";
import type { SessionUser } from "@/types/auth";

export interface ProvidersProps {
  children: ReactNode;
  /** Session read on the server, so the first paint already knows the user. */
  initialUser: SessionUser | null;
  initialAccessToken?: string | null;
}

/**
 * Every client-side provider, in one place.
 *
 * Order matters: `AuthProvider` uses TanStack Query for the session, so it sits
 * inside `QueryProvider`. `ConfirmProvider` mounts one shared dialog for the
 * whole app rather than one per table row.
 */
export function Providers({ children, initialUser, initialAccessToken }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Avoids a colour flash while the theme transition would otherwise run.
      disableTransitionOnChange
    >
      <QueryProvider>
        <AuthProvider initialUser={initialUser} initialAccessToken={initialAccessToken}>
          {/* Required by any Radix Tooltip in the tree — table cells use them. */}
          <TooltipProvider delayDuration={300}>
            <ConfirmProvider>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </ConfirmProvider>
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
