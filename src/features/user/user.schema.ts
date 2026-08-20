import { z } from "zod";

import { USER_STATUSES } from "./user.types";

/**
 * Form validation — fast, specific feedback, not a security control.
 *
 * These rules mirror the API's `createUserSchema`/`updateUserSchema` closely
 * enough that a valid form is very unlikely to be rejected, but they are not a
 * restatement of its business rules. "Is this address already registered?" is
 * the API's question and comes back as a 409 mapped onto the email field;
 * "does this look like an address at all?" belongs here.
 *
 * The 10-character password minimum is the one number worth keeping in sync by
 * hand — the API rejects anything shorter, and finding that out after a round
 * trip is a worse experience than being told while typing.
 */
export const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email address").max(255),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(128, "Keep it under 128 characters")
    // Empty is allowed so the same schema drives the edit form, where the
    // password field is not rendered at all. `toUpdateInput` drops it.
    .or(z.literal("")),
  role: z.string().min(1, "Select a role"),
  status: z.enum(USER_STATUSES),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const userFormDefaults: UserFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "USER",
  status: "ACTIVE",
};
