import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { departmentResource } from "@/features/department";
import { ResourceCreatePage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New department" };

export default async function CreateDepartmentPage() {
  await requirePermission(PERMISSIONS.department.create, { returnTo: "/departments/create" });

  return <ResourceCreatePage resource={departmentResource} />;
}
