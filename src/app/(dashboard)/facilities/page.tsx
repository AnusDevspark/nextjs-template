import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { facilityResource } from "@/features/facility";
import { ResourceListPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Facilities" };

/**
 * Identical in shape to the providers page, despite Facility using a completely
 * different backend envelope, a configured form and a custom detail component.
 * That difference is absorbed by the resource definition, not by the route.
 */
export default async function FacilitiesPage() {
  await requirePermission(PERMISSIONS.facility.view, { returnTo: "/facilities" });

  return <ResourceListPage resource={facilityResource} />;
}
