import type { StatusMap } from "@/components/common/status-badge";
import type { BaseListQuery } from "@/lib/query/list-query";

/**
 * Facility domain types.
 *
 * Facility differs from Provider on purpose: it carries a nested `address`
 * object, its backend uses a completely different response envelope, and its
 * detail page is a custom component. Together those prove the framework does
 * not quietly assume every module looks like the first one built.
 */

export const FACILITY_TYPES = [
  "HOSPITAL",
  "CLINIC",
  "URGENT_CARE",
  "SURGERY_CENTER",
  "LABORATORY",
  "IMAGING_CENTER",
] as const;

export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_STATUSES = ["OPERATIONAL", "LIMITED", "CLOSED"] as const;
export type FacilityStatus = (typeof FACILITY_STATUSES)[number];

export const facilityStatusMap: StatusMap<FacilityStatus> = {
  OPERATIONAL: { tone: "success", label: "Operational" },
  LIMITED: { tone: "warning", label: "Limited service" },
  CLOSED: { tone: "danger", label: "Closed" },
};

/** Nested value object — kept nested rather than flattened onto the entity. */
export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Facility {
  id: string;
  name: string;
  code: string;
  type: FacilityType;
  status: FacilityStatus;
  address: Address;
  phone: string | null;
  email: string | null;
  bedCount: number | null;
  departmentCount: number;
  providerCount: number;
  openedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFacilityInput {
  name: string;
  code: string;
  type: FacilityType;
  status: FacilityStatus;
  address: Address;
  phone?: string | null;
  email?: string | null;
  bedCount?: number | null;
  openedOn?: string | null;
}

export type UpdateFacilityInput = Partial<CreateFacilityInput>;

export type FacilityListQuery = BaseListQuery & {
  type?: string | string[];
  status?: string;
  state?: string;
  city?: string;
};

/** Single-line address, for table cells and lookup descriptions. */
export function formatAddress(address: Address): string {
  return [address.line1, address.line2, address.city, address.state, address.postalCode]
    .filter(Boolean)
    .join(", ");
}

export function formatFacilityType(type: string): string {
  const spaced = type.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const facilityTypeOptions = FACILITY_TYPES.map((value) => ({
  value,
  label: formatFacilityType(value),
}));

export const facilityStatusOptions = FACILITY_STATUSES.map((value) => ({
  value,
  label: facilityStatusMap[value].label ?? value,
}));
