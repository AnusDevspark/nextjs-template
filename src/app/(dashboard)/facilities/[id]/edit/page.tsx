import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { facilityResource } from "@/features/facility";
import { ResourceEditPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit facility" };

export default async function EditFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.facility.edit, { returnTo: `/facilities/${id}/edit` });

  return <ResourceEditPage resource={facilityResource} id={id} />;
}
