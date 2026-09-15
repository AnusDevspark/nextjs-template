import Link from "next/link";
import { ArrowRightIcon, UsersIcon } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PERMISSIONS } from "@/constants/permissions";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/permissions";
import { getUserDisplayName } from "@/types/auth";

/**
 * The module tiles.
 *
 * One entry, because the template ships one resource. Add yours here as you
 * build them — this list is editorial, like the sidebar, and is not derived
 * from a registry.
 */
const MODULES = [
  {
    title: "Users",
    href: "/users",
    icon: UsersIcon,
    permission: PERMISSIONS.user.view,
    description: "People with access to this application.",
  },
] as const;

/**
 * Dashboard home.
 *
 * A Server Component that reads the session directly — no client-side fetch, no
 * loading state, and the permission filtering happens before anything renders.
 */
export default async function DashboardPage() {
  const session = await getSession();

  const modules = MODULES.filter((module) =>
    session ? hasPermission(session.permissions, module.permission) : false,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          session ? `Welcome back, ${getUserDisplayName(session.user).split(" ")[0]}` : "Dashboard"
        }
        description="Jump into a module to get started."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link key={module.href} href={module.href} className="group">
              <Card className="group-hover:border-foreground/20 h-full transition-colors">
                <CardHeader>
                  <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="flex items-center gap-1.5 text-base">
                    {module.title}
                    <ArrowRightIcon className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">{module.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {modules.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You do not have access to any modules yet. Contact an administrator.
          </p>
        ) : null}
      </div>
    </div>
  );
}
