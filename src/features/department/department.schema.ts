import { z } from "zod";

import { DEPARTMENT_STATUSES } from "./department.types";

export const departmentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().regex(/^[A-Z0-9-]{2,10}$/, "Use 2–10 uppercase letters, digits or hyphens"),
  facilityId: z.string().min(1, "Select a facility"),
  status: z.enum(DEPARTMENT_STATUSES),
  description: z
    .string()
    .max(500, "Keep the description under 500 characters")
    .optional()
    .default(""),
});

export type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export const departmentFormDefaults: DepartmentFormValues = {
  name: "",
  code: "",
  facilityId: "",
  status: "ACTIVE",
  description: "",
};
