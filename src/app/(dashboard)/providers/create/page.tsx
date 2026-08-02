import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { providerResource } from "@/features/provider";
import { ResourceCreatePage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New provider" };

export default async function CreateProviderPage() {
  await requirePermission(PERMISSIONS.provider.create, { returnTo: "/providers/create" });

  return <ResourceCreatePage resource={providerResource} />;
}
