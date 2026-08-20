import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { userResource } from "@/features/user";
import { ResourceListPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Users" };

/**
 * Pages gate and delegate — nothing else.
 *
 * The permission check runs on the server before anything renders, so an
 * unauthorised visitor never receives the markup. That is UX, not security: the
 * API enforces the same permission on every request this page will make.
 */
export default async function UsersPage() {
  await requirePermission(PERMISSIONS.user.view, { returnTo: "/users" });

  return <ResourceListPage resource={userResource} />;
}
