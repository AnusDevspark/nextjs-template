import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { facilityResource } from "@/features/facility";
import { ResourceCreatePage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New facility" };

export default async function CreateFacilityPage() {
  await requirePermission(PERMISSIONS.facility.create, { returnTo: "/facilities/create" });

  return <ResourceCreatePage resource={facilityResource} />;
}
