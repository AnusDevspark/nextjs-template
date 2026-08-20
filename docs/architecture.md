# Architecture

Why the pieces are arranged the way they are.

---

## The problem

A CRUD-heavy business application has many modules — Users, Roles, Teams,
Projects, Invoices, Reports, whatever your domain turns out to be — that differ
in every detail and agree on every workflow.

Written naively, each module reimplements: a listing page, a table, pagination,
search, filters, sorting, URL state, loading, empty and error states, create and
edit pages, forms, validation, backend error mapping, delete confirmation, row
actions, permission checks, breadcrumbs, toasts and cache invalidation. Fifteen
modules means fifteen copies, fifteen places for a bug to hide, and fifteen
places to change when the design system moves.

## The shape of the solution

```
Reusable infrastructure   →  API client, errors, auth, permissions, query
        ↓
Reusable engines          →  ResourceList/Create/Edit/DetailPage
        ↓
Resource configuration    →  defineResource({ … })
        ↓
Feature components        →  columns, forms, detail sections
        ↓
Escape hatches            →  replace any of the above with ordinary React
```

Target split: roughly 80% shared infrastructure, 20% feature-specific code. A
simple module reaches better than that; a complex one deliberately does not, and
that is fine.

---

## Three levels of reuse

**Level 1 — Primitives** (`components/ui/`)
Button, Input, Dialog, Select, Table. shadcn/Radix. No business knowledge.

**Level 2 — Application building blocks** (`components/`)
`DataTable`, `PageHeader`, `DetailView`, `FormInput`, `ConfirmDialog`,
`AsyncCombobox`, `StatusBadge`, `EmptyState`, `ErrorState`. They know about
_applications_ — pagination, validation, permissions — but nothing about your
domain.

**Level 3 — Workflow engines** (`framework/resource/`)
`ResourceListPage`, `ResourceCreatePage`, `ResourceEditPage`,
`ResourceDetailPage`. They know what a CRUD workflow _is_.

Features compose all three. A feature may skip Level 3 entirely and still get
enormous value from Levels 1 and 2 — that is the intended graceful degradation.

---

## Dependency direction

```
app  →  features  →  framework  →  components / lib
```

Enforced by convention and review:

- `framework/` and `components/` never import from `features/`.
- `features/` may import from any lower layer.
- Feature-to-feature imports are allowed **at the component level** — an Invoice
  form may use a Customer feature's `CustomerSelect`. Customer owns its lookup;
  Invoice composes it. That is composition, not coupling, and the alternative (a
  `shared/selects/` folder holding every feature's dropdown) is worse.

---

## Server and client boundaries

Server Components handle routing, authentication, permission gating, page
metadata and the shell. Client Components handle the interactive body.

The constraint that shapes everything: **a Server Component cannot pass a plain
object containing functions to a Client Component.** React can only serialize a
client reference — a value exported from a `"use client"` module.

That produces two rules:

| File            | Directive      | Why                                                                                                                                                                                                  |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `*.resource.ts` | `"use client"` | Contains cell renderers and form components. Marking it client makes the whole definition one client reference, so `<ResourceListPage resource={userResource} />` works from a Server Component. |
| `*.api.ts`      | none           | Takes an `ApiClient` argument, so the same adapter runs with `clientApi` in the browser and `serverApi` on the server.                                                                               |

The listing page therefore reads:

```tsx
export default async function UsersPage() {
  await requirePermission(PERMISSIONS.user.view);
  return <ResourceListPage resource={userResource} />;
}
```

### Why lists fetch on the client

`ResourceListPage` is a Client Component that fetches through TanStack Query.
That is deliberate: a list is URL-driven, paginated, filterable and refetched
after every mutation — exactly the interactive server state TanStack Query
exists for. Round-tripping every page change through the server would be slower
and would discard the cache.

Server-side prefetching remains available: `*.api.ts` is importable from a
Server Component, so a page can prefetch into a `QueryClient` and wrap the
engine in `HydrationBoundary`. It is an opt-in per page, not a default, because
for most admin tables the skeleton is cheaper than the complexity.

---

## The API adapter layer

The single most valuable boundary in this codebase.

The companion `node-template` API is consistent — every response is
`{ success, message?, data }`, and lists add `meta`. Those shapes are mirrored
once in `src/lib/api/contract.ts` and documented in `API-CONTRACT.md`, so the
`user` adapter is thin: unwrap `.data`, hand `meta` to `toListResult`, done.

The layer earns its keep the moment a second backend appears — a legacy service,
a partner API, something written by a team with different taste. Envelopes you
will meet in the wild, and what the adapter does with each:

| Envelope                                             | What the adapter absorbs                          |
| ---------------------------------------------------- | ------------------------------------------------- |
| `{ responseData: { message: { items, total } } }`    | Two layers of nesting nobody above needs to know   |
| `{ data: { content, totalElements, number, size } }` | Spring conventions, and **zero-indexed** pages     |
| `{ items, pagination: { total } }`                   | Nothing — no mapper worth writing                 |

Every one of them produces:

```ts
type ResourceListResult<T> = {
  items: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};
```

`buildPageMeta`, `toListResult`, `toUnknownTotalResult`, `toQueryParams` and
`pick` in `resource-adapter.ts` exist for exactly this translation — including a
backend that returns no `total` at all.

Nothing above the adapter knows which backend it is talking to. When a backend
team changes its envelope, exactly one file changes.

Write a DTO mapper only when the shapes genuinely differ. If the response
already matches the view model — as `user`'s does — writing one "for symmetry"
adds a file that copies fields one-to-one: the kind of consistency that costs
maintenance and buys nothing.

---

## Error handling

One `ApiError` type, produced by `parseApiError` (HTTP responses) and
`toNetworkError` (fetch rejections, timeouts, aborts):

```ts
{ status, code, message, errors: [{ path, message }], requestId }
```

Presentation is centralised in `lib/errors/error-messages.ts`:

- `getErrorMessage` never surfaces a 5xx body verbatim — those contain stack
  traces and driver errors.
- `getErrorTitle` maps status to a short heading.
- `shouldToastError` returns false when the error has field errors, because
  those belong beside the input, not in a toast that vanishes while the user is
  reading the form.
- `getErrorReference` surfaces the backend request id, the single most useful
  thing a user can quote to support.

`applyApiErrorsToForm` turns `errors: [{ path: "email", … }]` into
`form.setError("email", …)`, normalizing paths (`contacts[0].phone` →
`contacts.0.phone`, `body.email` → `email`) and routing anything that does not
match a rendered field to a form-level message — because attaching an error to
an invisible field blocks submission with something the user can never fix.

---

## URL as the source of truth

List state — page, pageSize, search, sortBy, sortOrder, filters — lives in
`searchParams`. There is no parallel `useState` copy to drift.

This makes a filtered table refresh-safe, shareable, bookmarkable and
back-button friendly. `parseListQuery` runs unchanged on the server and in the
browser, so a prefetch and the client query that hydrates it produce identical
objects and therefore identical cache keys.

Everything is clamped: `?page=-5&pageSize=99999` never reaches the backend.
Only declared filter keys are read, so an injected param is ignored.

---

## Caching

`createQueryKeys(key)` gives every resource the same four-level hierarchy:

```
["user"]                       all user data
["user", "list"]               every list, any query
["user", "list", { page: 1 }]  one specific list
["user", "detail", "abc"]      one record
```

Because the levels are prefixes, `invalidateQueries({ queryKey: keys.lists() })`
matches every cached page and filter combination at once — there is no key list
to maintain as filters are added.

The mutation rules live in `resource-query.ts`, once:

- create → invalidate all lists (the new record could appear anywhere)
- update → seed the detail cache with the response, invalidate all lists
- delete → **remove** the detail entry (refetching a deleted record 404s),
  invalidate all lists

No feature writes cache-management code, which is why "the table is stale after
a delete" stopped being a recurring bug.

---

## Permissions

One catalogue produces a `Permission` union type, so typos are compile errors.
Pure predicates (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`) have
no React and no `server-only`, so the same functions run everywhere — server
guards, the client context, and tests.

Three layers:

| Layer               | Purpose                    | Not for                                  |
| ------------------- | -------------------------- | ---------------------------------------- |
| `proxy.ts`          | Cookie presence → redirect | Verifying tokens or checking permissions |
| `requirePermission` | The frontend gate          | Security                                 |
| Backend             | Security                   | —                                        |

The resource's `permissions` block drives navigation, buttons, row actions and
route guards automatically.

---

## What was deliberately not built

- **No `BasePage` / `BaseForm` / `GenericFeature`.** Similar-looking code is not
  a reason to share it.
- **No global modal manager.** Radix primitives plus one shared `ConfirmProvider`
  cover the real cases.
- **No universal column generator.** Business columns need real components.
- **No config language for forms.** Two modes — declarative fields for grids,
  custom components for everything else.
- **No Zustand store.** Installed, unused, waiting for a genuine cross-tree
  state need. Adding one for consistency would be the exact mistake this
  document argues against.
- **No Storybook.** See the README for when it starts to pay.
- **No blanket Server Action wrappers.** The Node API is already the API.
