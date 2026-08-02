import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { departmentResource } from "@/features/department";
import { ResourceDetailPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Department" };

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.department.view, { returnTo: `/departments/${id}` });

  return <ResourceDetailPage resource={departmentResource} id={id} />;
}
