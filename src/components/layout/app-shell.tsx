"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { env } from "@/config/env";

import { AppSidebar, SidebarNav } from "./app-sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/**
 * The authenticated application shell: sidebar, header, content area.
 *
 * Client-side because navigation highlighting and the mobile sheet need
 * `usePathname` and local state. The pages it wraps are unaffected — `children`
 * arrives as already-rendered content, so a Server Component page stays a
 * Server Component.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-64 p-0">
              {/* Radix requires a title for the dialog's accessible name. */}
              <SheetTitle className="border-b px-5 py-4 text-sm font-semibold">
                {env.NEXT_PUBLIC_APP_NAME}
              </SheetTitle>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link href="/" className="text-sm font-semibold md:hidden">
            {env.NEXT_PUBLIC_APP_NAME}
          </Link>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* `key` restarts enter transitions and scroll position per route. */}
        <main key={pathname} className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
