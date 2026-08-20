import type { FieldValues } from "react-hook-form";

import { collectFilterKeys, collectMultiValueKeys } from "@/components/data-table";
import type { BaseListQuery, ListQuery, ListQueryConfig } from "@/lib/query/list-query";

import type {
  AnyResource,
  ResourceApi,
  ResourceCapabilities,
  ResourceDefinition,
  ResourceId,
  StandardAction,
} from "./resource.types";

/**
 * Input to `defineResource`. Identical to `ResourceDefinition` except that
 * `capabilities` is optional — it is derived from the API by default.
 */
type ResourceInput<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TQuery extends BaseListQuery,
  TFormValues extends FieldValues,
> = Omit<
  ResourceDefinition<TEntity, TCreateInput, TUpdateInput, TQuery, TFormValues>,
  "capabilities"
> & {
  capabilities?: Partial<ResourceCapabilities>;
};

/**
 * Creates a resource definition.
 *
 * All five type parameters are inferred from the object you pass:
 * `TEntity`/`TCreateInput`/`TUpdateInput`/`TQuery` come from the `api` you
 * built with `createResourceApi`, and `TFormValues` from `form.schema`. Call
 * sites therefore need no explicit type arguments:
 *
 *   export const userResource = defineResource({ ... });
 *
 * The function itself does almost nothing at runtime — it fills in defaults and
 * returns a frozen object. Keeping it dumb is deliberate: the value of this
 * framework is in the page engines that read the definition, not in clever
 * construction logic that would be hard to debug.
 */
export function defineResource<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TQuery extends BaseListQuery,
  TFormValues extends FieldValues,
>(
  input: ResourceInput<TEntity, TCreateInput, TUpdateInput, TQuery, TFormValues>,
): ResourceDefinition<TEntity, TCreateInput, TUpdateInput, TQuery, TFormValues> {
  const { api, routes, capabilities } = input;

  return Object.freeze({
    ...input,
    // Default each capability to whether the resource can actually do it: an
    // adapter without `create` gets no create button, no create route guard and
    // no "New …" action, with nothing to configure.
    capabilities: {
      create: capabilities?.create ?? Boolean(api.create && routes.create),
      edit: capabilities?.edit ?? Boolean(api.update && routes.edit),
      delete: capabilities?.delete ?? Boolean(api.remove),
      detail: capabilities?.detail ?? Boolean(routes.detail),
      export: capabilities?.export ?? Boolean(input.export),
    },
  });
}

/**
 * Builds a typed API adapter.
 *
 * A pass-through at runtime; its job is to pin the generic parameters so
 * `defineResource` can infer them, and so a mistyped return shape is caught
 * where the adapter is written rather than deep inside the table.
 */
export function createResourceApi<
  TEntity,
  TCreateInput = never,
  TUpdateInput = never,
  TQuery extends BaseListQuery = ListQuery,
>(
  api: ResourceApi<TEntity, TCreateInput, TUpdateInput, TQuery>,
): ResourceApi<TEntity, TCreateInput, TUpdateInput, TQuery> {
  return api;
}

/**
 * The URL-parsing config implied by a resource's list configuration.
 *
 * Used by both the client hook and any server-side prefetch, so both derive the
 * identical query object — and therefore the identical cache key.
 */
export function getListQueryConfig(resource: AnyResource): ListQueryConfig {
  const filters = resource.list.filters ?? [];

  return {
    defaultPageSize: resource.list.defaultPageSize,
    defaultSort: resource.list.defaultSort,
    filterKeys: collectFilterKeys(filters),
    multiValueKeys: collectMultiValueKeys(filters),
  };
}

/** Which standard row actions to render, honouring capabilities and routes. */
export function getStandardActions(resource: AnyResource): StandardAction[] {
  const requested = resource.actions?.standard ?? (["view", "edit", "delete"] as StandardAction[]);

  return requested.filter((action) => {
    if (action === "view") return resource.capabilities.detail && Boolean(resource.routes.detail);
    if (action === "edit") return resource.capabilities.edit && Boolean(resource.routes.edit);
    return resource.capabilities.delete;
  });
}

/** Detail route for an id, or `undefined` when the resource has no detail page. */
export function detailHref(resource: AnyResource, id: ResourceId): string | undefined {
  return resource.capabilities.detail ? resource.routes.detail?.(id) : undefined;
}

/** Edit route for an id, or `undefined` when editing is unavailable. */
export function editHref(resource: AnyResource, id: ResourceId): string | undefined {
  return resource.capabilities.edit ? resource.routes.edit?.(id) : undefined;
}
