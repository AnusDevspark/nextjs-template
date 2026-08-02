"use client";

import type { FieldPath, FieldValues } from "react-hook-form";

import { FormAsyncCombobox, type BaseFieldProps } from "@/components/forms";
import { clientApi } from "@/lib/api";

import { facilityApi } from "../facility.api";

/**
 * Facility lookup field.
 *
 * There can be thousands of facilities, so this queries the API with a
 * debounced search term and pages results in — it never downloads the full list
 * to populate a dropdown. All of that behaviour comes from `AsyncCombobox`;
 * this file only supplies the two API calls.
 */
export function FacilitySelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: BaseFieldProps<TFieldValues, TName> & { placeholder?: string }) {
  return (
    <FormAsyncCombobox
      {...props}
      queryKey="facility"
      placeholder={props.placeholder ?? "Select a facility"}
      searchPlaceholder="Search facilities…"
      emptyMessage="No facilities found."
      loadOptions={({ search, page, signal }) =>
        facilityApi.lookup!({ search, page }, { client: clientApi, signal })
      }
      loadSelected={(value, signal) => facilityApi.lookupOne!(value, { client: clientApi, signal })}
    />
  );
}
