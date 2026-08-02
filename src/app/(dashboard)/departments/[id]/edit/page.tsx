import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { departmentResource } from "@/features/department";
import { ResourceEditPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit department" };

export default async function EditDepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.department.edit, { returnTo: `/departments/${id}/edit` });

  return <ResourceEditPage resource={departmentResource} id={id} />;
}
