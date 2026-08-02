import { z } from "zod";

import { PROVIDER_SPECIALTIES, PROVIDER_STATUSES } from "./provider.types";

/**
 * Form validation for Provider.
 *
 * Frontend validation is about giving fast, specific feedback — it is not a
 * security control and it does not restate the backend's business rules. "Is
 * this NPI already registered?" belongs to the API; "is this ten digits?"
 * belongs here.
 */
export const providerFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),

  email: z.email("Enter a valid email address"),

  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || value.replace(/\D/g, "").length >= 10, {
      message: "Enter a valid phone number",
    })
    .optional()
    .default(""),

  npi: z.string().regex(/^\d{10}$/, "NPI must be exactly 10 digits"),

  specialty: z.enum(PROVIDER_SPECIALTIES, { message: "Select a specialty" }),

  credentials: z.array(z.string()).default([]),

  status: z.enum(PROVIDER_STATUSES),

  facilityId: z.string().nullable().default(null),

  acceptingNewPatients: z.boolean().default(false),

  startDate: z.string().nullable().default(null),

  notes: z.string().max(2000, "Notes cannot exceed 2000 characters").optional().default(""),
});

export type ProviderFormValues = z.infer<typeof providerFormSchema>;

/** Blank form. Also the reference for which fields exist. */
export const providerFormDefaults: ProviderFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  npi: "",
  specialty: "FAMILY_MEDICINE",
  credentials: [],
  status: "PENDING",
  facilityId: null,
  acceptingNewPatients: false,
  startDate: null,
  notes: "",
};

export const CREDENTIAL_OPTIONS = [
  { value: "MD", label: "MD" },
  { value: "DO", label: "DO" },
  { value: "NP", label: "NP" },
  { value: "PA", label: "PA" },
  { value: "RN", label: "RN" },
  { value: "PHD", label: "PhD" },
] as const;
