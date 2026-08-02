/**
 * Provider feature public surface.
 *
 * Pages import from here; nothing outside the feature reaches into its
 * internals. `provider.api` is exported so a Server Component can prefetch with
 * `serverApi` — it is a plain module, unlike the `"use client"` resource.
 */
export { providerResource } from "./provider.resource";
export { providerApi, deactivateProvider } from "./provider.api";
export { ProviderSelect } from "./components/provider-select";

export {
  providerFullName,
  formatSpecialty,
  providerStatusMap,
  providerStatusOptions,
  specialtyOptions,
  PROVIDER_SPECIALTIES,
  PROVIDER_STATUSES,
  type Provider,
  type ProviderStatus,
  type ProviderSpecialty,
  type ProviderListQuery,
  type CreateProviderInput,
  type UpdateProviderInput,
} from "./provider.types";

export {
  providerFormSchema,
  providerFormDefaults,
  type ProviderFormValues,
} from "./provider.schema";
