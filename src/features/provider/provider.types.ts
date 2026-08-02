import type { StatusMap } from "@/components/common/status-badge";
import type { BaseListQuery } from "@/lib/query/list-query";

/**
 * Provider domain types.
 *
 * Hand-written here. Once the backend publishes an OpenAPI document, replace
 * these with imports from `src/generated/api-types.ts` — see
 * `docs/api-types.md`. The view model can still differ from the DTO where the
 * UI genuinely needs a different shape.
 */

export const PROVIDER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "SUSPENDED"] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

/**
 * Status → colour mapping. Lives with the feature because `ACTIVE` means
 * something different for a provider than for a facility, and a shared global
 * status map would force one meaning on both.
 */
export const providerStatusMap: StatusMap<ProviderStatus> = {
  ACTIVE: { tone: "success", label: "Active" },
  INACTIVE: { tone: "muted", label: "Inactive" },
  PENDING: { tone: "warning", label: "Pending review" },
  SUSPENDED: { tone: "danger", label: "Suspended" },
};

export const PROVIDER_SPECIALTIES = [
  "CARDIOLOGY",
  "DERMATOLOGY",
  "FAMILY_MEDICINE",
  "NEUROLOGY",
  "ONCOLOGY",
  "ORTHOPEDICS",
  "PEDIATRICS",
  "PSYCHIATRY",
  "RADIOLOGY",
] as const;

export type ProviderSpecialty = (typeof PROVIDER_SPECIALTIES)[number];

export interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  /** National Provider Identifier — 10 digits. */
  npi: string;
  specialty: ProviderSpecialty;
  credentials: string[];
  status: ProviderStatus;
  facilityId: string | null;
  facilityName: string | null;
  acceptingNewPatients: boolean;
  startDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  npi: string;
  specialty: ProviderSpecialty;
  credentials: string[];
  status: ProviderStatus;
  facilityId?: string | null;
  acceptingNewPatients: boolean;
  startDate?: string | null;
  notes?: string | null;
}

/** Updates are partial: the edit form may submit only what changed. */
export type UpdateProviderInput = Partial<CreateProviderInput>;

/** The base query plus this module's own filters. */
export type ProviderListQuery = BaseListQuery & {
  status?: string;
  specialty?: string | string[];
  facilityId?: string;
  acceptingNewPatients?: string;
};

export function providerFullName(provider: Provider): string {
  return `${provider.firstName} ${provider.lastName}`.trim();
}

/** `FAMILY_MEDICINE` → `Family medicine` */
export function formatSpecialty(specialty: string): string {
  const spaced = specialty.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const specialtyOptions = PROVIDER_SPECIALTIES.map((value) => ({
  value,
  label: formatSpecialty(value),
}));

export const providerStatusOptions = PROVIDER_STATUSES.map((value) => ({
  value,
  label: providerStatusMap[value].label ?? value,
}));
