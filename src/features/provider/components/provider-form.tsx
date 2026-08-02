"use client";

import {
  FormCheckbox,
  FormDatePicker,
  FormGrid,
  FormInput,
  FormMultiSelect,
  FormSection,
  FormSelect,
  FormShell,
  FormTextarea,
} from "@/components/forms";
import { FacilitySelect } from "@/features/facility/components/facility-select";
import type { ResourceFormProps } from "@/framework/resource";

import { CREDENTIAL_OPTIONS, type ProviderFormValues } from "../provider.schema";
import { providerStatusOptions, specialtyOptions, type Provider } from "../provider.types";

/**
 * Custom Provider form (form Mode 2).
 *
 * Written by hand because the layout is genuinely specific: sectioned groups, a
 * cross-feature facility lookup, and a status field that is read-only while a
 * provider is suspended.
 *
 * Everything *around* the fields still comes from the framework. `form` arrives
 * pre-wired with the Zod resolver and the record's values; `handleSubmit` runs
 * validation, the mutation, backend error mapping, the success toast, cache
 * invalidation and the redirect. This component owns its inputs and nothing
 * else — which is the whole point of the escape hatch.
 */
export function ProviderForm({
  mode,
  entity,
  form,
  handleSubmit,
  submitting,
  onCancel,
  submitLabel,
}: ResourceFormProps<Provider, ProviderFormValues>) {
  // A suspended provider's status is changed through the reinstatement
  // workflow, not by editing this field.
  const statusLocked = mode === "edit" && entity?.status === "SUSPENDED";

  return (
    <FormShell
      form={form}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitLabel={submitLabel}
      onCancel={onCancel}
    >
      <FormSection title="Identity" description="Name and professional identifiers.">
        <FormGrid>
          <FormInput
            control={form.control}
            name="firstName"
            label="First name"
            autoComplete="given-name"
            required
          />
          <FormInput
            control={form.control}
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            required
          />
          <FormInput
            control={form.control}
            name="npi"
            label="NPI"
            description="10-digit National Provider Identifier"
            placeholder="1234567890"
            required
            // The NPI identifies the record for the backend; changing it after
            // creation is a data-migration concern, not an edit.
            disabled={mode === "edit"}
          />
          <FormMultiSelect
            control={form.control}
            name="credentials"
            label="Credentials"
            options={CREDENTIAL_OPTIONS}
            placeholder="Select credentials"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Contact">
        <FormGrid>
          <FormInput
            control={form.control}
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
          />
          <FormInput
            control={form.control}
            name="phone"
            type="tel"
            label="Phone"
            autoComplete="tel"
            placeholder="(555) 123-4567"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Practice" description="Where and how this provider works.">
        <FormGrid>
          <FormSelect
            control={form.control}
            name="specialty"
            label="Specialty"
            options={specialtyOptions}
            required
          />

          {/* Cross-feature composition: Facility owns its own lookup. */}
          <FacilitySelect
            control={form.control}
            name="facilityId"
            label="Facility"
            description="Leave empty for unaffiliated providers"
          />

          <FormSelect
            control={form.control}
            name="status"
            label="Status"
            options={providerStatusOptions}
            disabled={statusLocked}
            description={statusLocked ? "Suspended providers must be reinstated first." : undefined}
            required
          />

          <FormDatePicker control={form.control} name="startDate" label="Start date" />

          <FormCheckbox
            control={form.control}
            name="acceptingNewPatients"
            label="Accepting new patients"
            description="Shown to schedulers when booking appointments."
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Notes">
        <FormTextarea
          control={form.control}
          name="notes"
          label="Internal notes"
          description="Not visible to patients."
          rows={4}
        />
      </FormSection>
    </FormShell>
  );
}
