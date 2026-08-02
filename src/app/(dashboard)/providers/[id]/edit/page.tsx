import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { providerResource } from "@/features/provider";
import { ResourceEditPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit provider" };

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.provider.edit, { returnTo: `/providers/${id}/edit` });

  return <ResourceEditPage resource={providerResource} id={id} />;
}
