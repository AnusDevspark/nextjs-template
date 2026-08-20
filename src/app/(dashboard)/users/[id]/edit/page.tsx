import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { userResource } from "@/features/user";
import { ResourceEditPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit user" };

/**
 * Gated on USER_EDIT, which is what the API requires to edit *someone else*.
 *
 * Editing your own profile needs no permission — the API treats that as an
 * ownership rule rather than a grant. This page does not expose that path, so
 * the stricter gate is the correct one here; a "my profile" route would call
 * `requireSession` instead.
 */
export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.user.edit, { returnTo: `/users/${id}/edit` });

  return <ResourceEditPage resource={userResource} id={id} />;
}
