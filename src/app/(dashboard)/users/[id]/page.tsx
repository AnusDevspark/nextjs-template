import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { userResource } from "@/features/user";
import { ResourceDetailPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "User" };

/** `params` is a Promise in Next 16 — synchronous access was removed. */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.user.view, { returnTo: `/users/${id}` });

  return <ResourceDetailPage resource={userResource} id={id} />;
}
