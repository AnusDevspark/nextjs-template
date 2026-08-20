# Architecture review

Measured results, a duplication audit, ratings, and answers to the twenty
design questions.

---

## Before and after

### Before

```
Invoice    listing, pagination, filters, search, sorting, actions,
            loading, errors, form page, edit page, details, delete
            modal, permissions
Team    all of it again
User  all of it again
…15 more modules
```

### After

```
Application framework
  ResourceListPage / CreatePage / EditPage / DetailPage
  DataTable, DetailView, form infrastructure
  Query keys and invalidation, permissions, auth, API normalization,
  error handling, dialogs, toasts

Features supply only their differences.
```

### Measured

| Layer                                                  |     Lines | Notes                                                        |
| ------------------------------------------------------ | --------: | ------------------------------------------------------------ |
| `framework/resource/`                                  |     2,230 | The four engines, definition types, hooks, adapters, actions |
| `components/` (data-table, forms, detail-view, common) |     4,489 | Level 2 building blocks                                      |
| `lib/` + `hooks/`                                      |     1,946 | API client, errors, auth, permissions, query, formatters     |
| **Shared total**                                       | **8,665** |                                                              |
| Invoice (rich)                                        |     1,016 | Custom form, custom cells, business action, export           |
| Team (different)                                   |       942 | Different envelope, nested address, custom detail + filter   |
| User (simple)                                    |       334 | Configuration and schema only                                |
| Routes (12 files)                                      |       186 | 3–8 lines each                                               |
| **Feature total**                                      | **2,478** |                                                              |

**78% shared / 22% feature-specific** across three modules — and the ratio
improves with every additional simple module, because the shared half is fixed.

User in full:

```
user.resource.ts   123   ← definition, form fields, detail sections
user.columns.tsx    64   ← all helper-built
user.api.ts         55   ← adapter, no DTO mapper needed
user.types.ts       49
user.schema.ts      25
index.ts                  18
─────────────────────────────
                         334   + 62 lines of routes
```

396 lines for a complete module with listing, pagination, search, filtering,
sorting, URL state, create, edit, detail, delete with confirmation, permissions,
breadcrumbs, toasts, cache invalidation and backend error mapping.

---

## Duplication audit

Every repeated pattern, and the decision made about it.

### Centralised — the framework owns these

| Pattern                          | Where                                | Why it was worth sharing                                                                                   |
| -------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| List page lifecycle              | `resource-list-page.tsx`             | Identical in every module; the differences are all data                                                    |
| Create / edit / detail lifecycle | `resource-*-page.tsx`                | Same; the 404-vs-error distinction alone is worth not re-deriving                                          |
| Submit lifecycle                 | `use-resource-form.ts`               | validate → map → call → map errors → toast → invalidate → redirect. Seven steps, zero variation            |
| Backend error → form field       | `apply-api-errors.ts`                | Was the single most-copied snippet in the "before" world                                                   |
| URL list state                   | `use-list-query-state.ts`            | Subtle (clamping, page reset on search, default omission) and easy to get slightly wrong                   |
| Query keys and invalidation      | `query-keys.ts`, `resource-query.ts` | Stale-after-delete is a recurring bug when each feature invents its own keys                               |
| Row actions                      | `resource-actions.tsx`               | Derived entirely from routes + permissions + capabilities                                                  |
| Delete confirmation              | `ConfirmProvider`                    | One dialog instance for the app, not one per row                                                           |
| 401 refresh                      | `client-api.ts`                      | Must be single-flight; per-hook implementations cause refresh storms                                       |
| Permission predicates            | `lib/permissions/`                   | Three pure functions, used from server, client and tests                                                   |
| Error normalization              | `lib/errors/`                        | Every layer above must see one error type                                                                  |
| Field accessibility              | `form-field.tsx`                     | label/for, `aria-describedby`, `aria-invalid`, `role="alert"` — implemented once, inherited by every field |

### Left feature-specific — deliberately not shared

| Pattern              | Why not                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Column definitions   | Presentation is the business logic. A generator would need a template language                                                          |
| Status → colour maps | `ACTIVE` means different things per module. One global map forces one meaning                                                           |
| DTO mappers          | Only two of three features need one. User having none is the point                                                                |
| Form layouts         | Invoice's sectioned form and User's grid are genuinely different problems                                                        |
| Detail layouts       | Team wants stat cards; Invoice wants field grids                                                                                   |
| Business actions     | `suspendUser` is Invoice's, and belongs in Invoice                                                                             |
| Feature lookups      | `CustomerSelect` is 15 lines over `AsyncCombobox`. Sharing them into `shared/selects/` would create a folder that imports every feature |

### Acceptable duplication

- **Route files.** Twelve near-identical 3–8 line files. A generator would save
  ~150 lines and cost explicitness; you would no longer be able to read
  `page.tsx` and know what the route does. Keep them.
- **`toCreateInput` / `toUpdateInput` often being identical.** A shared
  `toInput` would save two lines and remove the seam where they legitimately
  diverge.
- **`lookup` / `lookupOne` per adapter.** They differ per backend envelope; that
  is the adapter's job.
- **Mobile card renderers.** Genuinely different per resource.

### Would indicate a missing abstraction

Watch for these; none is present yet:

- A third feature writing its own pagination controls.
- Two features implementing the same custom filter type.
- Repeated `useEffect` chains synchronising two form fields.
- The same permission check written inline instead of via the resource.
- A second hand-rolled file-download implementation.

---

## Ratings

| Dimension              | Score | Reasoning                                                                                               |
| ---------------------- | :---: | ------------------------------------------------------------------------------------------------------- |
| Maintainability        |   9   | One place per concern; a design change to tables touches one file                                       |
| Reusability            |   9   | 78% shared, and rising per module added                                                                 |
| Scalability            |   8   | Scales to 50+ modules; the risk is definition sprawl, not architecture                                  |
| Simplicity             |   7   | The engines are readable, but `resource.types.ts` is a lot to absorb on day one                         |
| Type safety            |   8   | Strict TS, no `any` in feature code; a handful of contained `any` in framework variance positions       |
| Developer experience   |   9   | Inferred generics, no explicit type arguments at call sites, clear escape hatches                       |
| Performance            |   8   | Server-side pagination throughout, small client boundaries; mobile layout duplicates row DOM            |
| Testability            |   9   | Framework tested once, 85 tests; features test only their own behaviour                                 |
| Accessibility          |   8   | Radix primitives, centralised field wiring, `aria-sort`, live regions; not audited with a screen reader |
| Separation of concerns |   9   | Backend shape confined to adapters; permissions to one catalogue; errors to one type                    |

**Average: 8.4.** The two soft spots are honest: the type file is dense, and
mobile card rendering doubles row DOM (bounded by page size, and the alternative
causes hydration mismatches).

---

## The twenty questions

### 1. Which CRUD responsibilities are now fully centralised?

Page shells and headers; breadcrumbs; permission gating (server and client);
URL state for page, size, search, sort and filters; server-side pagination,
sorting and filtering; data fetching and caching; loading, empty, filtered-empty,
error, forbidden and 404 states; row actions; delete with confirmation; form
submission; backend error mapping to fields and to form level; success toasts;
cache invalidation; post-save navigation; file download and export; the 401
refresh cycle; field-level accessibility.

### 2. What does every new resource still need to implement?

Entity types; a Zod schema plus defaults; an API adapter; columns; filters;
either form fields or a form component; either detail sections or a detail
component; permission codes; routes; custom business actions; a navigation
entry; four thin route files.

That is the irreducible list — it is precisely _what this resource is_.

### 3. Which parts should NEVER be made fully generic?

Column cell rendering. Form layout for non-trivial forms. Business actions and
their preconditions. Status vocabularies. Anything where presentation encodes
domain meaning. Making these generic requires inventing a template language, and
at that point you have built a worse React.

### 4. Which resource abstractions are at greatest risk of overengineering?

1. **`ResourceFormField`** — the largest surface, and the one under constant
   pressure to grow `when` / `computed` / `dependsOn`. Hold the line: if a form
   needs conditional logic beyond `visible`/`disabled`, it needs a component.
2. **`FilterDefinition`** — same pressure. `type: "custom"` is the release valve
   and it must stay the answer.
3. **`ResourceExportConfig`** — currently earns its place at ~15 lines. If it
   grows column selection and scheduling, it is a feature, not config.
4. **A `presentation: "page" | "dialog"` flag.** Considered and deliberately
   left out: dialog-hosted creation couples the list page, the create route and
   the success path tightly enough that a half-supported flag would be worse
   than none. Creating in a dialog today means rendering `<ResourceForm
mode="create" variant="plain" />` inside your own `<Dialog>`, which keeps the
   whole submit lifecycle. Add the flag only if several modules want it.

### 5. What should remain normal React components?

Everything a user looks at. Cells, form bodies, detail bodies, dashboards,
wizards, calendars, empty-state illustrations, feature-specific widgets. The
framework should own _lifecycles_, never _pixels_.

### 6. When should I abandon `ResourceFormPage` and build a custom page?

Multi-step wizards; fields with real interdependence; nested editable
collections; submission that is not one POST/PATCH; pages where the form is a
minority of the screen. Keep `useResourceForm` — it hands you the mutation,
error mapping, toasts, invalidation and navigation while you own the layout.

### 7. When should I abandon `DetailView` and build a custom detail screen?

Tabs, timelines, embedded child tables, aggregates and charts, layout-driven
views (floor plans, calendars). A practical trigger: when more than about a
third of your fields already use `render`, the configuration is JSX with extra
steps — switch to `details.component`. Team does exactly this.

### 8. When should I use resource configuration versus normal JSX?

Configuration when the thing is uniform: a grid of labelled inputs, a list of
label/value pairs, a date column, a select filter. JSX when presentation carries
meaning: an avatar with credentials and a tooltip, a two-line address, a
role-dependent field. If you find yourself wanting a conditional in the config,
that is the signal to write the component.

### 9. How should weird backend responses be isolated?

Entirely inside the resource's `*.api.ts`. It is the only file permitted to know
the envelope. Use `toListResult` / `buildPageMeta` for normalization,
`toQueryParams` for key renaming, a DTO → view-model mapper when the shapes
genuinely differ. This repo proves the pattern with three real envelopes,
including one with zero-indexed pages. When a backend changes, one file changes.

### 10. How should resource-specific business actions be implemented?

As plain exported functions in the feature's API module — `suspendUser`,
`cancelTask` — wired through `actions.custom`. They get permission
filtering, confirmation, pending state, error toasting and refresh from the
framework. Do **not** force them into `ResourceApi`; that contract is about CRUD,
and stretching it to cover business verbs is how a clean interface rots.

### 11. Which responsibilities should remain feature-owned?

Entity and DTO types; the API adapter and mappers; columns; filters; validation
schema; form layout; detail layout; status maps; business actions; feature
components; feature-specific tests.

### 12. Which responsibilities belong to shared infrastructure?

Transport and error normalization; authentication and refresh; permission
evaluation; query client, keys and invalidation; URL state parsing; table
rendering, pagination, sorting, filtering, column visibility, selection; form
field primitives and accessibility; error-to-form mapping; dialogs, toasts,
loading and empty states; page shell, navigation, theme.

### 13. Which repeated code is acceptable duplication?

The twelve route files (explicitness beats a generator). `toCreateInput` and
`toUpdateInput` being identical in simple modules. `lookup`/`lookupOne` per
adapter. Mobile card renderers. Similar-looking status maps with different
meanings. Feature `index.ts` barrels.

### 14. Which repeated code indicates a missing abstraction?

A third feature hand-rolling pagination. Two features writing the same custom
filter type. Repeated effect chains syncing form fields. Inline permission
checks that bypass the resource. A second file-download implementation. Two
features parsing the same date format by hand. Any error-mapping code outside
`apply-api-errors.ts`.

### 15. How would this architecture handle 50+ business modules?

The shared half stays fixed at roughly 8,700 lines. Fifty simple modules at
~400 lines each is ~20,000 lines of feature code — against perhaps 150,000 if
each module reimplemented its own infrastructure.

Three things need attention at that scale:

- **Navigation** grows into a flat list. Add grouping and a command palette
  around module 15.
- **`PERMISSIONS`** becomes a large object. Splitting it per domain while keeping
  one exported union is straightforward.
- **Bundle size.** Route-level code splitting is automatic, but audit that
  feature barrels are not pulling unrelated modules into a shared chunk.

Nothing structural breaks.

### 16. How do we prevent the framework from becoming an internal framework nobody understands?

- Keep every engine readable end to end. `resource-list-page.tsx` is ~230 lines
  of ordinary React with no metaprogramming.
- No runtime magic: no registries, no decorators, no dynamic imports by
  convention, no reflection over the definition.
- Advanced TypeScript only where it buys real safety. Generics are inferred
  from `api` and `schema`; call sites write no type arguments.
- Escape hatches at every layer, documented and _used_ by the examples — so the
  path out is well-trodden rather than theoretical.
- Test the framework itself. 85 tests are also executable documentation.
- Enforce the rule of three before promoting anything.

The honest weak point is `resource.types.ts` at ~420 lines. If it keeps growing,
split it by concern (list / form / details / actions) before it becomes the file
nobody reads.

### 17. Which abstractions should be deleted if used only once?

Audit these first: `toUnknownTotalResult` and `pick` (adapter helpers currently
used by no feature); `createListColumn`, `createCurrencyColumn`,
`createBooleanColumn` (unused helpers); `RefreshingOverlay`; `FormRadioGroup`
and `FormDateRange` if no module adopts them; `resourceKeys` as a re-export of
`createQueryKeys`; the `/api/bff` proxy if you settle on `direct` mode
permanently.

The rule: a "helper" used once is a function with an extra indirection. Inline
it.

### 18. How should the architecture evolve after 10–20 real modules?

- Re-run the duplication audit; promote what actually repeated three times.
- Delete the helpers that never got a second caller.
- Expect `ResourceFormField` to want new types — add the two or three that
  genuinely recur, and refuse conditional logic.
- Split `resource.types.ts` if it has grown.
- Revisit whether server prefetching should become the default for detail pages.
- Add navigation grouping and a command palette.
- Add Storybook _if_ a second team or a designer now consumes the components.
- Consider extracting `framework/` + `components/` into an internal package once
  a second application needs them — not before.

### 19. How could code generation help without replacing the runtime architecture?

Generate the _boilerplate_, never the _behaviour_:

- A `plop`/`hygen` scaffold emitting the six feature files and four routes,
  pre-filled with the entity name. Saves 20 minutes of typing; the output is
  ordinary code you then edit.
- `openapi-typescript` for DTOs — already wired via `npm run generate:api`, with
  a hard boundary at `src/generated/`.
- Optionally, generate a first-draft adapter and column list from an OpenAPI
  schema, as a starting point to edit rather than a file to maintain.

The line: generated code is checked in, human-readable and freely editable.
Nothing generated is regenerated over your edits, and nothing is interpreted at
runtime.

### 20. What would I change before adopting this across an enterprise application?

1. **Decide `direct` vs `proxy` deliberately.** `direct` puts the access token
   in JS memory. If your threat model does not accept that, use `proxy` and
   pair it with a strict CSP.
2. **Add a CI gate** running `typecheck`, `lint`, `test` and `build` on every
   pull request. Nothing below matters if the suite is not enforced.
3. **Add observability.** Wire the Sentry hook, and log `requestId` on every
   `ApiError` so frontend and backend traces join up.
4. **Add a permission integration test** that asserts every backend-enforced
   permission has a frontend counterpart, so the two lists cannot silently drift.
5. **Run a real accessibility audit** with a screen reader on the table, the
   combobox and the confirm dialog. The primitives are sound; the compositions
   have not been verified by a human.
6. **Set an explicit list-page-size ceiling** and a server-side maximum, so no
   client can request 200 rows of a wide table.
7. **Add optimistic updates** for the specific mutations where latency is felt —
   not everywhere.
8. **Decide the i18n story now** if you will ever need one. Strings are
   currently inline; retrofitting is far cheaper at three modules than at thirty.
9. **Write down the rule of three** somewhere the team reads, and give someone
   the job of saying no to framework additions.
