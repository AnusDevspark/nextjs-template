import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Rendered for unmatched routes and for `notFound()` calls without a closer boundary. */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <FileQuestionIcon className="size-6" />
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-medium">Page not found</h1>
        <p className="text-muted-foreground max-w-md text-sm text-balance">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>

      <Button variant="outline" asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
