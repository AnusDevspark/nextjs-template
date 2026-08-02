"use client";

import type { FieldPath, FieldValues } from "react-hook-form";

import { FormAsyncCombobox, type BaseFieldProps } from "@/components/forms";
import { clientApi } from "@/lib/api";

import { providerApi } from "../provider.api";

/**
 * Provider lookup field.
 *
 * A thin binding of the generic `FormAsyncCombobox` to this feature's API —
 * roughly fifteen lines, because debouncing, pagination, resolving the label
 * for a preselected id and the ARIA wiring all live in the shared component.
 *
 * Every lookup in the app (`FacilitySelect`, `DepartmentSelect`, …) follows
 * this same shape.
 */
export function ProviderSelect<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(props: BaseFieldProps<TFieldValues, TName> & { placeholder?: string }) {
  return (
    <FormAsyncCombobox
      {...props}
      queryKey="provider"
      placeholder={props.placeholder ?? "Select a provider"}
      searchPlaceholder="Search providers…"
      loadOptions={({ search, page, signal }) =>
        providerApi.lookup!({ search, page }, { client: clientApi, signal })
      }
      loadSelected={(value, signal) => providerApi.lookupOne!(value, { client: clientApi, signal })}
    />
  );
}
