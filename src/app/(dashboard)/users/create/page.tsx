import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { userResource } from "@/features/user";
import { ResourceCreatePage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New user" };

export default async function CreateUserPage() {
  await requirePermission(PERMISSIONS.user.create, { returnTo: "/users/create" });

  return <ResourceCreatePage resource={userResource} />;
}
