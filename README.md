# Resource-oriented Next.js application starter

A reusable foundation for CRUD-heavy business applications. It exists to answer
one problem:

> Every business module is different, but the workflow is always the same.

The framework owns **how CRUD works**. A feature describes **what its resource
contains**. A straightforward module — see `src/features/user/` — is about
250 lines of configuration and schema, with no page, form, table or dialog code
of its own.

This is not a CRUD generator. There is no `createCrudModule<T>()` that emits a
feature. It is a set of engines you compose with ordinary React, and every one
of them can be bypassed without leaving the architecture.

---

## Contents

- [Quick start](#quick-start)
- [Environment](#environment)
- [Backend integration](#backend-integration)
- [Authentication](#authentication)
- [Architecture](#architecture)
- [The resource framework](#the-resource-framework)
- [Escape hatches](#escape-hatches)
- [API adapters](#api-adapters)
- [Permissions](#permissions)
- [State management rules](#state-management-rules)
- [Adding a resource](#adding-a-resource)
- [Testing](#testing)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Further reading](#further-reading)

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in NEXT_PUBLIC_API_URL and API_URL
npm run dev
```

Open http://localhost:3000. You will be redirected to `/login`.

**This template talks to a real Node.js API.** It ships no mock server. Until
your backend is running at `API_URL`, the login request fails and the resource
pages render their error state. That is the intended behaviour — the framework
is verified by the test suite (`npm test`), which uses MSW, not by a fake
runtime backend.

Requires Node.js 20.9+ (the Next.js 16 minimum). Developed on Node 24.

---

## Environment

Variables are validated with Zod at import time, so a missing or malformed value
fails immediately with a readable message rather than becoming `undefined` deep
inside a request.

| Variable                 | Scope   | Purpose                                              |
| ------------------------ | ------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_APP_NAME`   | browser | Shown in the sidebar and page titles                 |
| `NEXT_PUBLIC_APP_URL`    | browser | Canonical origin of this app                         |
| `NEXT_PUBLIC_API_URL`    | browser | Node API base URL the browser calls                  |
| `NEXT_PUBLIC_API_MODE`   | browser | `direct` or `proxy` — see below                      |
| `NEXT_PUBLIC_SENTRY_DSN` | browser | Optional; blank disables reporting                   |
| `API_URL`                | server  | Node API base URL the server calls (may be internal) |
| `API_TIMEOUT_MS`         | server  | Server-side request timeout                          |
| `API_PROXY_ENABLED`      | server  | Must be `true` to enable `/api/bff/*`                |
| `AUTH_ACCESS_COOKIE`     | server  | Access-token cookie name                             |
| `AUTH_REFRESH_COOKIE`    | server  | Refresh-token cookie name                            |
| `AUTH_REFRESH_MAX_AGE`   | server  | Refresh cookie lifetime, seconds                     |

- Browser-safe config: `src/config/env.ts`
- Server-only config: `src/config/server-env.ts` (imports `server-only`, so an
  accidental client import is a build error)

---

## Backend integration

```
Browser → Next.js → Node REST API → PostgreSQL
```

The backend owns business logic, transactions, authorization enforcement,
validation and audit. This app owns UI, routing, forms, frontend validation,
URL state and API consumption. Backend rules are not duplicated here.

### Which calls go where

| Call                                  | Route                                     | Why                                                                        |
| ------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Login / logout / refresh / session    | Browser → **Next.js** → Node              | Tokens must be written to HttpOnly cookies, which only a server can do     |
| Resource data from the browser        | Browser → **Node**                        | Next.js would add a hop and no value; the request is already authenticated |
| Resource data from a Server Component | Next.js → **Node**                        | Uses `serverApi`, which reads the cookie directly                          |
| Anything, when CORS is impossible     | Browser → **Next.js `/api/bff/*`** → Node | Opt-in fallback, off by default                                            |

Use `NEXT_PUBLIC_API_MODE=direct` (the default) when you can send CORS headers
from the Node API:

```
Access-Control-Allow-Origin: <NEXT_PUBLIC_APP_URL>
Access-Control-Allow-Credentials: true
```

Use `NEXT_PUBLIC_API_MODE=proxy` **and** `API_PROXY_ENABLED=true` when you
cannot, or when the access token must never be readable by JavaScript. The
proxy at `src/app/api/bff/[...path]/route.ts` attaches the token and forwards
the request. It does not re-implement any endpoint.

Do **not** wrap every Node endpoint in a Route Handler or Server Action. The
Node API is already the API.

---

## Authentication

Assumes the backend provides `POST /auth/login`, `POST /auth/logout`,
`POST /auth/refresh` and `GET /auth/me`.

### Token handling

- **Refresh token** — HttpOnly, Secure, SameSite=Lax cookie on the Next.js
  origin. Never reaches JavaScript, never touches `localStorage`.
- **Access token** — also stored in an HttpOnly cookie, which is what Server
  Components read. In `direct` mode a copy is additionally held in a
  module-level variable in the browser, because a cookie set on the app origin
  cannot be sent to a different API origin.

The in-memory access token is readable by JavaScript, and therefore by an XSS
payload. That is the cost of calling a cross-origin API directly. Mitigate it by
keeping the token short-lived, rotating it on refresh, and shipping a strict
Content-Security-Policy. It disappears entirely in `proxy` mode. Choose with
that trade-off in view.

### Refresh

Refresh is implemented **once**, in `src/lib/api/client-api.ts`. When a request
returns 401 the client calls `refreshSession()`, which is single-flight: ten
parallel 401s await one shared promise and produce exactly one refresh request.
On success the original requests are retried; on definitive failure the session
is cleared and the user is sent to `/login?expired=1`.

No hook, page or feature contains 401 handling.

### Route protection

Three layers, each doing only what it is good at:

1. `src/proxy.ts` (Next.js 16 renamed `middleware` to `proxy`) — checks for a
   session cookie and redirects. Coarse and fast; it does not verify the token.
2. `requireSession()` / `requirePermission()` in Server Components — the real
   frontend gate.
3. The backend — the actual security boundary.

---

## Architecture

```
src/
├── app/                        # routes only; pages are 3–8 lines
│   ├── (auth)/login/
│   ├── (dashboard)/            # authenticated shell + providers
│   │   ├── users/             # list, create, detail, edit
│   ├── api/auth/               # BFF: login, logout, refresh, session
│   ├── api/bff/[...path]/      # optional proxy, off by default
│   ├── forbidden/  error.tsx  global-error.tsx  not-found.tsx
│
├── framework/resource/         # LEVEL 3 — workflow engines
│   ├── resource.types.ts       # the definition contract
│   ├── define-resource.ts      # defineResource, createResourceApi
│   ├── resource-adapter.ts     # helpers for normalizing responses
│   ├── resource-query.ts       # list/detail/mutation hooks + cache rules
│   ├── resource-list-page.tsx
│   ├── resource-create-page.tsx
│   ├── resource-edit-page.tsx
│   ├── resource-detail-page.tsx
│   ├── resource-form.tsx       # dispatches config vs custom form
│   ├── resource-form-fields.tsx
│   ├── use-resource-form.ts    # the submit lifecycle
│   └── resource-actions.tsx    # row actions from routes + permissions
│
├── features/                   # one folder per business module
│   ├── auth/  user/           # the worked example
│
├── components/
│   ├── ui/                     # LEVEL 1 — shadcn primitives
│   ├── data-table/             # LEVEL 2 — table engine + column helpers
│   ├── forms/                  # LEVEL 2 — RHF fields, error mapping
│   ├── detail-view/            # LEVEL 2 — detail layout + field builders
│   ├── layout/                 # shell, sidebar, header, theme
│   └── common/                 # PageHeader, EmptyState, ErrorState, …
│
├── lib/
│   ├── api/                    # fetch client, server/client flavours, downloads
│   ├── auth/                   # cookies, server session, client context
│   ├── permissions/            # pure predicates
│   ├── errors/                 # ApiError + normalization + presentation
│   ├── query/                  # query client, keys, URL list-query parsing
│   ├── formatters/             # date, currency, phone, …
│   └── utils.ts
│
├── hooks/  config/  constants/  generated/  types/  test/
```

### Dependency direction

```
app → features → framework → components/lib
```

Shared infrastructure never imports a feature. Features may compose each other
at the component level (an Invoice form using a `CustomerSelect`), which is normal
composition, not a layering violation.

### Server vs client boundaries

Server Components own routing, auth, permission gates, page metadata and the
shell. Client Components own the interactive body: tables, forms, dialogs.

One rule makes this work: **a `*.resource.ts` file is a `"use client"` module.**
It references React components (cell renderers, form components), so marking it
client turns the whole definition into a single client reference that a Server
Component can pass straight through:

```tsx
export default async function UsersPage() {
  await requirePermission(PERMISSIONS.user.view);
  return <ResourceListPage resource={userResource} />;
}
```

`*.api.ts` files are deliberately **not** `"use client"`. They take an
`ApiClient` as an argument, so the same adapter runs in a browser hook
(`clientApi`) and in a Server Component (`serverApi`) for optional prefetching.

---

## The resource framework

A definition describes only what is specific to the module:

```ts
export const userResource = defineResource({
  key: "user",
  name: "User",
  pluralName: "Users",

  getId: (p) => p.id,
  getLabel: userFullName,

  routes: {
    list: "/users",
    create: "/users/create",
    detail: (id) => `/users/${id}`,
    edit: (id) => `/users/${id}/edit`,
  },

  permissions: PERMISSIONS.user,
  api: userApi,

  list: {
    columns: userColumns,
    filters: userFilters,
    defaultSort: { field: "lastName", order: "asc" },
  },
  form: {
    schema: userFormSchema,
    defaultValues: userFormDefaults,
    component: UserForm,
  },
  details: { sections: userDetailSections },
  actions: { custom: [deactivateAction] },
  export: { path: "/users/export", formats: ["csv", "xlsx"] },
});
```

All five type parameters are inferred — from `api` (built with
`createResourceApi`) and from `form.schema`. Call sites never write type
arguments.

`capabilities` is derived from the adapter: an API without `create` produces no
create button, no create action and no create route guard, with nothing to
configure. Override explicitly when you need to.

### What you get for free

| Concern                                                            | Owned by    |
| ------------------------------------------------------------------ | ----------- |
| Page header, breadcrumbs, titles                                   | engine      |
| Permission-gated create / edit / delete buttons                    | engine      |
| URL state: page, size, search, sort, filters                       | engine      |
| Server-side pagination, sorting, filtering                         | engine      |
| Loading skeletons, empty states, error states, 404                 | engine      |
| Row actions, delete confirmation, custom actions                   | engine      |
| Form submission, backend error mapping, toasts, redirects          | engine      |
| Query keys and cache invalidation                                  | engine      |
| Columns, filters, schema, fields, detail content, business actions | **feature** |

---

## Escape hatches

No part of the framework traps you. Each engine keeps the surrounding lifecycle
and lets you replace the content.

| Replace            | How                                                     | Example in this repo           |
| ------------------ | ------------------------------------------------------- | ------------------------------ |
| The table body     | `list.component`                                        | —                              |
| One cell           | an ordinary `ColumnDef` with a `cell` function          | `user.columns.tsx`         |
| The whole form     | `form.component` (or `createComponent`/`editComponent`) | `user-form.tsx`            |
| One field          | `{ type: "custom", render }`                            | —                              |
| The detail body    | `details.component`                                     | `user-details.tsx`         |
| One detail field   | `render` instead of `value`                             | `user.detail-sections.tsx` |
| A filter control   | `{ type: "custom", component }`                         | `user-status-filter.tsx`    |
| The response shape | the resource's API adapter                              | all three features             |

A custom form still receives a pre-wired `form` instance plus `handleSubmit`,
`submitting`, `error`, `onCancel` and `submitLabel` — so it inherits validation,
server-error mapping, cache invalidation, toasts and navigation while owning
nothing but its inputs.

### A genuinely complex module

A Scheduler with a calendar, availability editor, drag-and-drop shifts and
cross-midnight rules should **not** be forced through `form.fields` or
`details.sections`. It would:

- Skip `ResourceListPage` and render its own calendar page, or use
  `list.component` to keep the page shell.
- Skip the form engine entirely and build a multi-step wizard.
- Still use: `serverApi` / `clientApi`, `ApiError` and error presentation,
  `requirePermission` and `PermissionGuard`, `PageHeader`, `ConfirmDialog`,
  toasts, `FormShell` and the form field primitives, `AsyncCombobox`,
  `createQueryKeys` and the mutation-invalidation pattern, and the app shell.

That is the design working as intended. The framework's floor is high and its
ceiling is "ordinary React".

---

## API adapters

Different backend modules return different shapes. That inconsistency stops at
the adapter, which is the only file allowed to know about it. All three example
features use genuinely different envelopes:

```ts
// This API   { success, data, meta }                              ← see API-CONTRACT.md
// Legacy     { responseData: { message: { items, total } } }
// Spring     { data: { content, totalElements, number, size } }   ← zero-indexed pages
```

Every one normalizes to:

```ts
type ResourceListResult<T> = {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
```

Write one with `createResourceApi`:

```ts
export const userApi = createResourceApi<User, CreateInput, UpdateInput, UserListQuery>({
  list: async (query, { client, signal }) => {
    const response = await client.get<ApiPaginated<UserDto>>("/users", {
      query: toQueryParams(query, { search: "q" }), // rename keys here
      signal,
    });
    const payload = response.responseData.message;

    return toListResult(payload.data.map(toUser), {
      page: query.page,
      pageSize: query.pageSize,
      total: payload.total,
    });
  },
  getById: /* … */,
  create: /* … */,
  update: /* … */,
  remove: /* … */,
  lookup: /* optional — powers AsyncCombobox */,
  lookupOne: /* optional */,
});
```

`create`, `update` and `remove` are optional, so read-only resources need no
stubs.

### Errors

Everything above the client sees one `ApiError`:

```ts
{ status, code, message, errors: [{ path, message }], requestId }
```

`parseApiError` reads several common envelopes (`errors` as an array of
`{ path | field, message }`, or as a map of field → string | string[]) and falls
back to the status line for non-JSON bodies. 5xx messages are never shown
verbatim.

### Mappers

Write a DTO → view-model mapper when the shapes genuinely differ — a
comma-separated string that should be an array, a flat address that should be
nested. **Do not** write one when they already match: `user` has none, and that
is the right call, not an oversight.

---

## Permissions

One catalogue in `src/constants/permissions.ts` produces a `Permission` union
type, so a typo is a compile error.

```ts
// Server — the frontend gate
await requirePermission(PERMISSIONS.user.view);
const allowed = await sessionCan(PERMISSIONS.user.edit);

// Client — UX only
const canCreate = usePermission(PERMISSIONS.user.create);
<PermissionGuard permission={PERMISSIONS.user.create}>…</PermissionGuard>;

// Pure predicates
hasPermission(set, code);
hasAnyPermission(set, codes);
hasAllPermissions(set, codes);
```

A resource's `permissions` block drives navigation filtering, the create button,
the edit button, the delete action, row actions and custom actions
automatically. No module repeats a permission check.

**Frontend permissions are UX. Backend permissions are security.** Hiding a
button does not stop anyone calling the endpoint.

---

## State management rules

| Problem                                       | Tool                                   |
| --------------------------------------------- | -------------------------------------- |
| Initial server data, auth, permission gates   | Server Component                       |
| Interactive server state (tables, mutations)  | TanStack Query                         |
| List state: page, size, search, sort, filters | `searchParams` via `useListQueryState` |
| Form state                                    | React Hook Form                        |
| Validation                                    | Zod                                    |
| Small local UI state                          | `useState`                             |
| Complex shared client state                   | Zustand                                |

Zustand is installed and unused. That is intentional: nothing in the current app
needs cross-tree client state, and adding a store "for consistency" would be
exactly the over-generalisation this architecture avoids. Reach for it when a
real case appears.

Never fetch initial server-renderable data in `useEffect`.

---

## Adding a resource

Full walkthrough: [`docs/adding-a-resource.md`](docs/adding-a-resource.md).

Short version — a standard module is five files:

```
src/features/invoice/
├── invoice.types.ts     # entity, status map, list query
├── invoice.schema.ts    # Zod + defaults
├── invoice.api.ts       # adapter (plain module)
├── invoice.columns.tsx  # "use client"
├── invoice.resource.ts  # "use client"  ← ties it together
└── index.ts
```

plus four route files of 3–8 lines each, a `PERMISSIONS` entry and a navigation
entry.

---

## Testing

```bash
npm test              # Vitest + Testing Library + MSW
npm run test:watch
npm run test:coverage
npm run test:e2e      # Playwright
```

**The framework is tested, so features do not have to be.** The suite covers
`ResourceListPage` (columns, loading, empty vs filtered-empty, error state,
pagination URL, search debounce and page reset, sort cycling, permission-gated
create, delete confirmation and cancel, custom-action visibility, default sort),
`ResourceEditPage` (load, prefill, 404 vs retryable error, permission block,
backend field-error mapping, successful submit and redirect, client validation
blocking the request), `PermissionGuard`, error normalization, URL query
parsing, adapter helpers and capability derivation.

That is why a feature test can be three assertions about that feature's own
behaviour instead of re-testing pagination for the fifteenth time.

Playwright specs are split:

- `e2e/*.smoke.spec.ts` — no backend needed; runs in CI.
- `e2e/*.api.spec.ts` — skipped unless `E2E_API_READY=true`.

### Storybook

Not included. It earns its place when the shared component layer
(`components/ui`, `components/forms`, `components/data-table`) is consumed by
several teams or shipped as a package, or when you want visual regression
testing. For a single app whose components are already exercised by real feature
tests, it is another build to maintain. Add it when a designer or a second team
needs it.

---

## Scripts

| Script                                    | Purpose                                 |
| ----------------------------------------- | --------------------------------------- |
| `npm run dev`                             | Development server (Turbopack)          |
| `npm run build`                           | Production build                        |
| `npm start`                               | Serve the production build              |
| `npm run typecheck`                       | `tsc --noEmit`                          |
| `npm run lint`                            | ESLint                                  |
| `npm run format`                          | Prettier                                |
| `npm test`                                | Unit and integration tests              |
| `npm run test:e2e`                        | Playwright                              |
| `npm run generate:api --spec=<url\|file>` | Regenerate `src/generated/api-types.ts` |

---

## Deployment

```bash
npm run build && npm start
```

Every authenticated route is dynamic (`ƒ`) because it reads cookies — correct
for per-user data, and it guarantees no page is prerendered carrying one user's
session.

Checklist:

- Set every variable from `.env.example` in the deployment environment.
- Serve over HTTPS; `secure` is set on auth cookies in production.
- If `NEXT_PUBLIC_API_MODE=direct`, configure CORS on the Node API.
- If `NEXT_PUBLIC_API_MODE=proxy`, also set `API_PROXY_ENABLED=true`.
- Add a Content-Security-Policy. It matters more here than usual, because in
  `direct` mode the access token lives in JavaScript memory.

`npm audit` reports advisories in `postcss` and `sharp`, both transitive
dependencies of `next` itself. They cannot be resolved without downgrading
Next.js to v9, and will clear when Next ships updated pins.

---

## Further reading

- [`docs/architecture.md`](docs/architecture.md) — layering, boundaries, and why
  each abstraction exists
- [`docs/adding-a-resource.md`](docs/adding-a-resource.md) — step-by-step guide
  with decision questions
- [`docs/decision-guides.md`](docs/decision-guides.md) — the two lookup tables:
  resource choices and React choices
- [`docs/architecture-review.md`](docs/architecture-review.md) — duplication
  audit, ratings, and answers to the twenty design questions
- [`src/generated/README.md`](src/generated/README.md) — OpenAPI type generation