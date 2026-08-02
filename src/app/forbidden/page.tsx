import type { Metadata } from "next";
import Link from "next/link";
import { LockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access denied" };

/**
 * Where `requirePermission` sends a signed-in user who lacks a permission.
 *
 * Distinct from `/login`: telling someone to sign in again when they are
 * already signed in sends them round a loop that cannot fix anything.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <LockIcon className="size-6" />
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-medium">You do not have access</h1>
        <p className="text-muted-foreground max-w-md text-sm text-balance">
          You do not have permission to view this page. Contact an administrator if you believe this
          is a mistake.
        </p>
      </div>

      <Button variant="outline" asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
