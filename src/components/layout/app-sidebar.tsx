"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { env } from "@/config/env";
import { isNavItemActive, navigation } from "@/config/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

/**
 * Sidebar navigation, filtered by permission.
 *
 * Rendered once in the dashboard layout and shared by the desktop rail and the
 * mobile sheet, so the two can never drift apart.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuth();

  const groups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-6 p-3">
      {groups.map((group, index) => (
        <div key={group.title ?? index} className="space-y-1">
          {group.title ? (
            <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wide uppercase">
              {group.title}
            </p>
          ) : null}

          {group.items.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {item.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar() {
  return (
    <aside className="bg-sidebar hidden w-60 shrink-0 border-r md:flex md:flex-col">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/" className="truncate text-sm font-semibold">
          {env.NEXT_PUBLIC_APP_NAME}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  );
}
