import type { ComponentType, ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { DefaultValues, FieldValues, Path, UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { LucideIcon } from "lucide-react";

import type { FilterDefinition } from "@/components/data-table";
import type { DetailSection } from "@/components/detail-view";
import type { ComboboxOption, ComboboxPage, SelectOption } from "@/components/forms";
import type { Permission } from "@/constants/permissions";
import type { ApiClient } from "@/lib/api";
import type { BaseListQuery, ListQuery, SortOrder } from "@/lib/query/list-query";

/**
 * Types for the resource framework.
 *
 * The organising idea: a resource definition describes **what is different**
 * about a business module. The page engines already know **how CRUD works**.
 */

export type ResourceId = string | number;

/** Normalized page metadata. Every adapter produces this, whatever the backend sends. */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * The normalized list shape the table engine consumes.
 *
 * Resource adapters convert whatever the backend returns into this, which is
 * why `{ responseData: { message: { items, total } } }` and
 * `{ data: { content, totalElements } }` can coexist without a single component
 * knowing about either.
 */
export interface ResourceListResult<TEntity> {
  items: TEntity[];
  meta: PageMeta;
}

/**
 * Passed to every adapter method.
 *
 * `client` is injected rather than imported, so one adapter works both in a
 * Server Component (`serverApi`) and in a browser hook (`clientApi`).
 */
export interface ResourceRequestContext {
  client: ApiClient;
  signal?: AbortSignal;
}

/**
 * The CRUD contract a resource implements.
 *
 * `create`, `update` and `remove` are optional so a read-only resource — a
 * reference table, an audit log — is expressible without stubbing methods that
 * would throw.
 */
export interface ResourceApi<
  TEntity,
  TCreateInput = never,
  TUpdateInput = never,
  TQuery extends BaseListQuery = ListQuery,
> {
  list: (query: TQuery, context: ResourceRequestContext) => Promise<ResourceListResult<TEntity>>;
  getById: (id: ResourceId, context: ResourceRequestContext) => Promise<TEntity>;
  create?: (data: TCreateInput, context: ResourceRequestContext) => Promise<TEntity>;
  update?: (
    id: ResourceId,
    data: TUpdateInput,
    context: ResourceRequestContext,
  ) => Promise<TEntity>;
  remove?: (id: ResourceId, context: ResourceRequestContext) => Promise<void>;
  /** Options for a lookup combobox backed by this resource. */
  lookup?: (
    params: { search: string; page: number },
    context: ResourceRequestContext,
  ) => Promise<ComboboxPage>;
  /** Resolves one option by id, for a preselected value on an edit form. */
  lookupOne?: (id: ResourceId, context: ResourceRequestContext) => Promise<ComboboxOption | null>;
}

export interface ResourceRoutes {
  list: string;
  create?: string;
  detail?: (id: ResourceId) => string;
  edit?: (id: ResourceId) => string;
}

/**
 * Permission codes for the standard operations.
 *
 * The framework reads these for navigation, buttons, row actions and route
 * guards, so a module never repeats a permission check. Omitting one means
 * "no permission required".
 */
export interface ResourcePermissions {
  view?: Permission;
  create?: Permission;
  edit?: Permission;
  delete?: Permission;
  export?: Permission;
}

/**
 * What the resource supports. Turning a capability off removes the
 * corresponding button, row action and route from the generated UI.
 */
export interface ResourceCapabilities {
  create: boolean;
  edit: boolean;
  delete: boolean;
  detail: boolean;
  export: boolean;
}

// --- List ------------------------------------------------------------------

export interface ResourceListViewProps<TEntity> {
  /** Rows for the current page. */
  items: TEntity[];
  meta: PageMeta;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => void;
}

export interface ResourceListConfig<TEntity, TQuery extends BaseListQuery> {
  /**
   * Ordinary TanStack column definitions. The engine adds a row-actions column
   * and, when selection is on, a checkbox column — nothing else is injected, so
   * any cell can render any component.
   */
  columns: ColumnDef<TEntity, unknown>[];
  filters?: FilterDefinition[];
  defaultSort?: { field: string; order: SortOrder };
  defaultPageSize?: number;
  searchPlaceholder?: string;
  /** Replaces the default "No X yet" block. */
  emptyState?: ReactNode;
  /** Card renderer for narrow screens, when a table is the wrong shape. */
  mobileRenderer?: (entity: TEntity) => ReactNode;
  enableRowSelection?: boolean;
  /** Makes rows clickable. Defaults to the detail route when one exists. */
  rowHref?: (entity: TEntity) => string;
  /** Extra buttons in the toolbar, e.g. a bulk import. */
  toolbarActions?: ComponentType<{ query: TQuery }>;
  /**
   * Escape hatch: replaces the whole table body with a custom component. The
   * surrounding page shell, permissions, URL state and data fetching still come
   * from the framework.
   */
  component?: ComponentType<ResourceListViewProps<TEntity>>;
}

// --- Form ------------------------------------------------------------------

/** A field in a configuration-driven form (Mode 1). */
export type ResourceFormField<TFormValues extends FieldValues> =
  | {
      type: "text" | "email" | "password" | "tel" | "url" | "number" | "textarea";
      name: Path<TFormValues>;
      label: string;
      description?: string;
      placeholder?: string;
      required?: boolean;
      fullWidth?: boolean;
      rows?: number;
      autoComplete?: string;
      disabled?: boolean | ((values: TFormValues) => boolean);
      visible?: (values: TFormValues) => boolean;
    }
  | {
      type: "select" | "combobox" | "radio";
      name: Path<TFormValues>;
      label: string;
      options: readonly SelectOption[];
      description?: string;
      placeholder?: string;
      required?: boolean;
      fullWidth?: boolean;
      disabled?: boolean | ((values: TFormValues) => boolean);
      visible?: (values: TFormValues) => boolean;
    }
  | {
      type: "multi-select";
      name: Path<TFormValues>;
      label: string;
      options: readonly SelectOption[];
      description?: string;
      placeholder?: string;
      required?: boolean;
      fullWidth?: boolean;
      disabled?: boolean | ((values: TFormValues) => boolean);
      visible?: (values: TFormValues) => boolean;
    }
  | {
      type: "checkbox" | "switch";
      name: Path<TFormValues>;
      label: string;
      description?: string;
      fullWidth?: boolean;
      disabled?: boolean | ((values: TFormValues) => boolean);
      visible?: (values: TFormValues) => boolean;
    }
  | {
      type: "date" | "date-range";
      name: Path<TFormValues>;
      label: string;
      description?: string;
      placeholder?: string;
      required?: boolean;
      fullWidth?: boolean;
      disabled?: boolean | ((values: TFormValues) => boolean);
      visible?: (values: TFormValues) => boolean;
    }
  | {
      /** An API-backed lookup, e.g. "Facility". */
      type: "async-combobox";
      name: Path<TFormValues>;
      label: string;
      queryKey: string;
      loadOptions: (params: {
        search: string;
        page: number;
        signal?: AbortSignal;
      }) => Promise<ComboboxPage>;
      loadSelected?: (value: string, signal?: AbortSignal) => Promise<ComboboxOption | null>;
      description?: string;
      placeholder?: string;
      required?: boolean;
      fullWidth?: boolean;
      disabled?: boolean | ((values: TFormValues) => boolean);
      visible?: (values: TFormValues) => boolean;
    }
  | {
      /** Anything the field types above cannot express. */
      type: "custom";
      name: Path<TFormValues>;
      render: (form: UseFormReturn<TFormValues>) => ReactNode;
      fullWidth?: boolean;
      visible?: (values: TFormValues) => boolean;
    }
  | {
      /** A titled group. Sections may not nest. */
      type: "section";
      title: string;
      description?: string;
      fields: ResourceFormField<TFormValues>[];
    };

/**
 * Props a custom form component receives (Mode 2).
 *
 * The form instance arrives pre-wired with the Zod resolver, the default values
 * and server-error mapping; `submit` runs the mutation and the whole success
 * lifecycle. A custom form therefore owns its fields and nothing else — which
 * is the point of the escape hatch.
 */
export interface ResourceFormProps<TEntity, TFormValues extends FieldValues> {
  mode: "create" | "edit";
  /** The loaded record. Always present in edit mode. */
  entity: TEntity | undefined;
  form: UseFormReturn<TFormValues>;
  /** Wrap your `<form onSubmit={...}>` with this. */
  handleSubmit: (event?: React.BaseSyntheticEvent) => Promise<void>;
  /** Call directly when submitting outside a `<form>`, e.g. a wizard. */
  submit: (values: TFormValues) => Promise<void>;
  submitting: boolean;
  error: unknown;
  onCancel: () => void;
  submitLabel: string;
}

export interface ResourceFormConfig<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TFormValues extends FieldValues,
> {
  /** Drives validation and, through `z.infer`, the form value type. */
  schema: z.ZodType<TFormValues>;
  /** Overrides `schema` for one mode, when create and edit validate differently. */
  createSchema?: z.ZodType<TFormValues>;
  editSchema?: z.ZodType<TFormValues>;

  /** Mode 1: declarative fields. */
  fields?: ResourceFormField<TFormValues>[];

  /** Mode 2: a custom component. Takes precedence over `fields`. */
  component?: ComponentType<ResourceFormProps<TEntity, TFormValues>>;
  createComponent?: ComponentType<ResourceFormProps<TEntity, TFormValues>>;
  editComponent?: ComponentType<ResourceFormProps<TEntity, TFormValues>>;

  /** Blank-form values for create. */
  defaultValues: DefaultValues<TFormValues>;
  /** Record → form values for edit. Defaults to a shallow copy of the entity. */
  toFormValues?: (entity: TEntity) => DefaultValues<TFormValues>;

  /** Form values → request body. Default: pass the values through. */
  toCreateInput?: (values: TFormValues) => TCreateInput;
  toUpdateInput?: (values: TFormValues, entity: TEntity) => TUpdateInput;

  /**
   * Grid width for configuration-driven forms.
   *
   * There is deliberately no `presentation: "page" | "dialog"` option here. A
   * dialog-hosted create flow needs the list page to own the dialog, the create
   * route to stop existing, and the success path to close rather than navigate
   * — enough coupling that a half-supported flag would be worse than none. To
   * create in a dialog today, render `<ResourceForm mode="create" />` inside
   * your own `<Dialog>` with `variant="plain"`: it keeps the full submit
   * lifecycle, and you control the shell.
   */
  columns?: 1 | 2 | 3;
}

// --- Details ---------------------------------------------------------------

export interface ResourceDetailViewProps<TEntity> {
  entity: TEntity;
  refetch: () => void;
}

export interface ResourceDetailConfig<TEntity> {
  sections?: DetailSection<TEntity>[];
  /** Escape hatch: replaces the generated sections entirely. */
  component?: ComponentType<ResourceDetailViewProps<TEntity>>;
}

// --- Actions ---------------------------------------------------------------

export type StandardAction = "view" | "edit" | "delete";

export interface ResourceActionHelpers {
  /** Refetches the current list or record. */
  refresh: () => void;
  navigate: (href: string) => void;
}

export interface ResourceConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

export interface ResourceCustomAction<TEntity> {
  key: string;
  label: string | ((entity: TEntity) => string);
  icon?: LucideIcon;
  permission?: Permission;
  /** Navigates. Mutually exclusive with `onClick`. */
  href?: (entity: TEntity) => string;
  onClick?: (entity: TEntity, helpers: ResourceActionHelpers) => void | Promise<void>;
  /** Hides the item entirely, e.g. "Deactivate" on an inactive record. */
  visible?: (entity: TEntity) => boolean;
  /** Shows the item greyed out, so the affordance stays discoverable. */
  disabled?: (entity: TEntity) => boolean | string;
  variant?: "default" | "destructive";
  /** Requires confirmation before `onClick` runs. */
  confirm?: ResourceConfirmOptions | ((entity: TEntity) => ResourceConfirmOptions);
  separatorBefore?: boolean;
}

export interface ResourceActionsConfig<TEntity> {
  /** Which generated actions to show. Defaults to all the capabilities allow. */
  standard?: StandardAction[];
  custom?: ResourceCustomAction<TEntity>[];
}

// --- Export ----------------------------------------------------------------

export interface ResourceExportConfig<TQuery extends BaseListQuery> {
  /** Path passed to `downloadFile`, e.g. `/providers/export`. */
  path: string;
  formats?: Array<"csv" | "xlsx" | "pdf">;
  /** Extra query params beyond the current list query. */
  buildQuery?: (query: TQuery, format: string) => Record<string, string | number | boolean>;
  filenameBase?: string;
}

// --- The definition --------------------------------------------------------

export interface ResourceDefinition<
  TEntity,
  TCreateInput = never,
  TUpdateInput = never,
  TQuery extends BaseListQuery = ListQuery,
  TFormValues extends FieldValues = FieldValues,
> {
  /** Cache namespace and URL-safe identifier, e.g. `"provider"`. */
  key: string;
  name: string;
  pluralName: string;
  description?: string;

  getId: (entity: TEntity) => ResourceId;
  /** Title for breadcrumbs, page headings and confirmation copy. */
  getLabel: (entity: TEntity) => string;

  routes: ResourceRoutes;
  permissions: ResourcePermissions;
  capabilities: ResourceCapabilities;

  api: ResourceApi<TEntity, TCreateInput, TUpdateInput, TQuery>;

  list: ResourceListConfig<TEntity, TQuery>;
  form?: ResourceFormConfig<TEntity, TCreateInput, TUpdateInput, TFormValues>;
  details?: ResourceDetailConfig<TEntity>;
  actions?: ResourceActionsConfig<TEntity>;
  export?: ResourceExportConfig<TQuery>;

  /** Overrides the default success toasts. */
  messages?: {
    created?: (entity: TEntity) => string;
    updated?: (entity: TEntity) => string;
    deleted?: (label: string) => string;
  };
}

/** A resource with any generic arguments, for code that only reads metadata. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyResource = ResourceDefinition<any, any, any, any, any>;
