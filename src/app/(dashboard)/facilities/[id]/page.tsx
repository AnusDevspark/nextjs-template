import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { facilityResource } from "@/features/facility";
import { ResourceDetailPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Facility" };

export default async function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.facility.view, { returnTo: `/facilities/${id}` });

  return <ResourceDetailPage resource={facilityResource} id={id} />;
}
