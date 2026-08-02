import type { StatusMap } from "@/components/common/status-badge";
import type { BaseListQuery } from "@/lib/query/list-query";

/**
 * Department domain types.
 *
 * Department is the simple case, and it is short on purpose: the backend's DTO
 * already matches what the UI needs, so there is no mapper — writing one "for
 * consistency" would be pure ceremony.
 */

export const DEPARTMENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export const departmentStatusMap: StatusMap<DepartmentStatus> = {
  ACTIVE: { tone: "success", label: "Active" },
  INACTIVE: { tone: "muted", label: "Inactive" },
};

export interface Department {
  id: string;
  name: string;
  code: string;
  facilityId: string;
  facilityName: string;
  headCount: number;
  status: DepartmentStatus;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentInput {
  name: string;
  code: string;
  facilityId: string;
  status: DepartmentStatus;
  description?: string | null;
}

export type DepartmentListQuery = BaseListQuery & {
  status?: string;
  facilityId?: string;
};

export const departmentStatusOptions = DEPARTMENT_STATUSES.map((value) => ({
  value,
  label: departmentStatusMap[value].label ?? value,
}));
