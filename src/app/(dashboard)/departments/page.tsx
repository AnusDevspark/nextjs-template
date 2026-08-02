import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { departmentResource } from "@/features/department";
import { ResourceListPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Departments" };

export default async function DepartmentsPage() {
  await requirePermission(PERMISSIONS.department.view, { returnTo: "/departments" });

  return <ResourceListPage resource={departmentResource} />;
}
