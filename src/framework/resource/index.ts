export {
  defineResource,
  createResourceApi,
  getListQueryConfig,
  getStandardActions,
  detailHref,
  editHref,
} from "./define-resource";

export {
  buildPageMeta,
  toListResult,
  toUnknownTotalResult,
  emptyListResult,
  toQueryParams,
  pick,
} from "./resource-adapter";

export {
  useResourceList,
  useResourceDetail,
  useResourceCache,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  resourceKeys,
} from "./resource-query";

export { useResourceForm, type UseResourceFormResult } from "./use-resource-form";
export { ResourceForm } from "./resource-form";
export { ResourceFormFields } from "./resource-form-fields";

export { ResourceListPage } from "./resource-list-page";
export { ResourceCreatePage } from "./resource-create-page";
export { ResourceEditPage } from "./resource-edit-page";
export { ResourceDetailPage } from "./resource-detail-page";

export { ResourceRowActions, createResourceActionsColumn } from "./resource-actions";

export type {
  AnyResource,
  PageMeta,
  ResourceActionsConfig,
  ResourceApi,
  ResourceCapabilities,
  ResourceCustomAction,
  ResourceDefinition,
  ResourceDetailConfig,
  ResourceDetailViewProps,
  ResourceExportConfig,
  ResourceFormConfig,
  ResourceFormField,
  ResourceFormProps,
  ResourceId,
  ResourceListConfig,
  ResourceListResult,
  ResourceListViewProps,
  ResourcePermissions,
  ResourceRequestContext,
  ResourceRoutes,
  StandardAction,
} from "./resource.types";
