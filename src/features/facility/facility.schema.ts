import { z } from "zod";

import { FACILITY_STATUSES, FACILITY_TYPES } from "./facility.types";

/**
 * Facility form validation.
 *
 * The nested `address` object is validated as a nested Zod object, which keeps
 * the form paths (`address.city`) aligned with the value shape and lets backend
 * errors on `address.postalCode` land on the right input with no extra mapping.
 */
export const addressSchema = z.object({
  line1: z.string().min(1, "Street address is required").max(120),
  line2: z.string().max(120).optional().default(""),
  city: z.string().min(1, "City is required").max(80),
  state: z.string().min(2, "State is required").max(40),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "Enter a valid postal code"),
  country: z.string().min(2).max(60).default("United States"),
});

export const facilityFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),

  code: z.string().regex(/^[A-Z0-9-]{3,12}$/, "Use 3–12 uppercase letters, digits or hyphens"),

  type: z.enum(FACILITY_TYPES, { message: "Select a facility type" }),
  status: z.enum(FACILITY_STATUSES),

  address: addressSchema,

  phone: z.string().optional().default(""),
  email: z
    .union([z.email("Enter a valid email address"), z.literal("")])
    .optional()
    .default(""),

  bedCount: z
    .number({ message: "Enter a number" })
    .int("Enter a whole number")
    .min(0)
    .max(10_000)
    .nullable()
    .default(null),

  openedOn: z.string().nullable().default(null),
});

export type FacilityFormValues = z.infer<typeof facilityFormSchema>;

export const facilityFormDefaults: FacilityFormValues = {
  name: "",
  code: "",
  type: "CLINIC",
  status: "OPERATIONAL",
  address: {
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
  },
  phone: "",
  email: "",
  bedCount: null,
  openedOn: null,
};
