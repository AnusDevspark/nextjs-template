import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { providerResource } from "@/features/provider";
import { ResourceListPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Providers" };

/**
 * The provider listing.
 *
 * A Server Component that does exactly two things: enforce the permission
 * server-side, then hand the resource to the engine. Pagination, search,
 * filters, sorting, URL state, loading, empty and error states, row actions and
 * delete confirmation all come from `ResourceListPage`.
 */
export default async function ProvidersPage() {
  await requirePermission(PERMISSIONS.provider.view, { returnTo: "/providers" });

  return <ResourceListPage resource={providerResource} />;
}
