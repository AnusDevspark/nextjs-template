import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { providerResource } from "@/features/provider";
import { ResourceDetailPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Provider" };

/** `params` is a Promise in Next.js 16 — see the async request APIs change. */
export default async function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.provider.view, { returnTo: `/providers/${id}` });

  return <ResourceDetailPage resource={providerResource} id={id} />;
}
