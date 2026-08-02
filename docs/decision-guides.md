# Decision guides

Two lookup tables, plus the rules behind them.

---

## Resource decision guide

| Need                                           | Use                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| Standard listing page                          | `ResourceListPage`                                                    |
| Custom table cells                             | Ordinary TanStack `ColumnDef` with a `cell` function                  |
| Repetitive column (text, date, status, number) | `create*Column` helper                                                |
| Completely custom list body                    | `list.component`                                                      |
| Fully custom listing page                      | Your own `page.tsx`; skip the engine, keep the shell                  |
| Simple form                                    | `form.fields` (Mode 1)                                                |
| Complex or interactive form                    | `form.component` (Mode 2)                                             |
| Create and edit differ materially              | `createComponent` / `editComponent`, or `createSchema` / `editSchema` |
| One awkward field in an otherwise simple form  | `{ type: "custom", render }`                                          |
| Standard detail page                           | `details.sections`                                                    |
| Detail page with stats, tabs, related data     | `details.component`                                                   |
| One detail field needing real presentation     | `render` instead of `value`                                           |
| Unusual backend response                       | The resource's API adapter                                            |
| Backend uses different query param names       | `toQueryParams(query, { search: "q" })`                               |
| Standard delete                                | Nothing — it is generated from `api.remove`                           |
| Business action (deactivate, cancel, approve)  | `actions.custom` + a plain exported API function                      |
| Read-only resource                             | Omit `create` / `update` / `remove` from the adapter                  |
| Lookup dropdown over thousands of rows         | `AsyncCombobox` via `FormAsyncCombobox`, backed by `api.lookup`       |
| Filter with API-sourced options                | `{ type: "custom", component }`                                       |
| CSV / XLSX export                              | `export: { path, formats }`                                           |
| Component only this feature uses               | `features/<name>/components/`                                         |
| Workflow three unrelated resources repeat      | Consider promoting to `framework/` or `components/`                   |

---

## React architecture decision guide

| Problem                                                    | Tool                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------ |
| Initial data for a server-renderable page                  | Server Component                                             |
| Auth and permission gating                                 | `requireSession` / `requirePermission` in a Server Component |
| Interactive server state (tables, refetch, mutations)      | TanStack Query                                               |
| Form state                                                 | React Hook Form                                              |
| Validation                                                 | Zod                                                          |
| Table and filter state                                     | `searchParams` via `useListQueryState`                       |
| Small component state                                      | `useState`                                                   |
| Shared complex client UI state                             | Zustand                                                      |
| Reading a value that changes but must not re-run an effect | `useRef` + effect, or `useEffectEvent`                       |
| Login, logout, refresh, cookie writes                      | Route Handler (`src/app/api/auth/`)                          |
| Controlled proxying to the Node API                        | Route Handler (`src/app/api/bff/`), opt-in                   |
| Coarse redirects before a route renders                    | `src/proxy.ts`                                               |
| Reusable UI                                                | `components/`                                                |
| Reusable CRUD workflow                                     | `framework/resource/`                                        |

---

## Server Component or Client Component?

Default to Server. Reach for `"use client"` only when the component needs
browser state, event handlers, effects, React Hook Form, TanStack Query,
Zustand, a browser API, or a Radix primitive.

Keep the boundary low in the tree. In this app the root layout, the dashboard
layout and every `page.tsx` are Server Components; the client boundary starts at
the app shell and at each resource engine.

A practical consequence worth knowing: a Server Component **cannot** pass a
plain object containing functions to a Client Component. That is why
`*.resource.ts` is a `"use client"` module — it becomes a single client
reference that crosses the boundary intact — while `*.api.ts` stays a plain
module so the server can call it too.

---

## When to abandon an engine

### Abandon `ResourceFormPage` when…

- The form is a multi-step wizard with per-step validation.
- Fields depend on each other in ways `visible` / `disabled` cannot express.
- The form manages a nested editable collection (shifts, line items, breaks).
- Submitting is not a single POST or PATCH.
- The page is mostly not a form — a calendar with an inspector panel, say.

Take `useResourceForm` with you. It gives you the mutation, backend error
mapping, toasts, cache invalidation and navigation while you own the layout
entirely.

### Abandon `DetailView` when…

- The page has tabs, or a timeline, or embedded child tables.
- It shows aggregates and charts rather than field values.
- Layout is the point — a floor plan, a calendar, a map.
- More than roughly a third of the fields already use `render`. At that point
  the configuration is just JSX with extra steps.

Use `details.component` and keep the header, breadcrumbs, permissions, loading,
404 and actions menu.

### Abandon the whole framework when…

The module is not a resource: a dashboard, a report builder, an import wizard, a
live monitoring board. Write ordinary pages and components. Keep using the app
shell, `requirePermission`, the API client, `ApiError`, form primitives, dialogs
and toasts.

---

## Configuration or JSX?

Use **configuration** when the thing being described is genuinely uniform:
column of dates, grid of labelled inputs, list of label/value pairs, select
filter over a fixed set.

Use **JSX** when presentation carries meaning: an avatar with credentials and a
badge; an address rendered over two lines; a status that also shows a tooltip; a
field visible only to one role.

The failure mode to avoid is a config format that grows a conditional language —
`when`, `unless`, `computed`, `formatArgs`. Once you want that, write the
component. Configuration should describe _data_; components should describe
_behaviour_.

---

## Should this be shared?

Promote to `components/` or `framework/` only when **all five** hold:

1. At least three unrelated features repeat the workflow.
2. The differences between them are expressible cleanly.
3. An escape hatch remains easy.
4. The abstraction removes real boilerplate, not three lines.
5. A new developer can understand it in one sitting.

Otherwise it stays in `features/<name>/`. Moving code to `shared/` because it
_might_ be reused is how frameworks become unreadable.

The inverse rule matters just as much: if something in `framework/` or
`components/` is used exactly once, move it back into the feature that uses it.
