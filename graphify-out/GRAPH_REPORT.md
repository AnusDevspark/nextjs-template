# Graph Report - /Users/devspark/Desktop/next-template  (2026-09-11)

## Corpus Check
- 166 files · ~66,475 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1015 nodes · 2510 edges · 70 communities (39 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Ts / Resource Types Ts
- Session Ts / Auth Context Tsx
- Ts / Error State Tsx
- Ts / Column Helpers Tsx
- Ts / Api Client Ts
- Ts / User Resource Ts
- Dependencies / React
- Dropdown Menu Tsx / User Menu Tsx
- Ts / Form Inputs Tsx
- Auth Cookies Ts / Server Api Ts
- Cn() / Command Tsx
- Error Envelope / Next Template Web Client
- Compileroptions / Include
- Form Combobox Tsx / Form Multi Select Tsx
- Loading Tsx / Page Tsx
- Components Json / Aliases
- Confirm Dialog Tsx / Alert Dialog Tsx
- Data Table Tsx / Table Tsx
- List Query Ts / Use List Query State
- Utils Ts / Page Header Tsx
- Data Table Filters Tsx / Use Debounced Value Ts
- Proxy Ts / Proxy()
- Data Table Pagination Tsx / Select Tsx
- Devdependencies / Eslint
- Scripts / Build
- Button Tsx / Button()
- Data Table Toolbar Tsx / Listfilters
- Filter Types Ts / Filterbase
- Prettierrc Json / Plugins
- Package Json / Name
- Admin Console Template / Api Contract Md
- Globe Icon / Svg Vector Image
- Browser Window / Title Bar Controls
- Architecture Review / Duplication Audit
- Auth Setup Ts / Storage State
- Eslint Config Mjs / Eslintconfig
- Jsdom
- Msw
- Next Config Ts / Nextconfig
- Openapi Typescript
- @Playwright
- Prettier
- Tailwindcss
- @Tailwindcss Postcss
- @Testing Library React
- @Testing Library User Event
- @Types Node
- @Types React
- @Types React Dom
- Typescript
- Vitest
- @Vitest Coverage V8
- Playwright Config Ts / Storagestate
- Postcss Config Mjs / Config
- Vercel Logo / White Triangle
- Permission Model / Route Protection Layers
- Next Js Agent Rules
- File Icon
- Next Js Logo
- Delete
- Get
- Patch
- Post
- Put

## God Nodes (most connected - your core abstractions)
1. `cn()` - 183 edges
2. `Button()` - 29 edges
3. `isApiError()` - 20 edges
4. `ApiError` - 18 edges
5. `getErrorMessage()` - 18 edges
6. `ResourceDefinition` - 17 edges
7. `compilerOptions` - 16 edges
8. `ApiClient` - 15 edges
9. `Permission` - 14 edges
10. `scripts` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Task API Adapter` --semantically_similar_to--> `API Adapter Layer`  [INFERRED] [semantically similar]
  docs/adding-a-resource.md → README.md
- `Single-flight Refresh` --conceptually_related_to--> `Authentication Handshake`  [INFERRED]
  README.md → API-CONTRACT.md
- `Caching Strategy` --conceptually_related_to--> `Resource Framework`  [INFERRED]
  docs/architecture.md → README.md
- `Three Levels of Reuse` --conceptually_related_to--> `Resource Framework`  [INFERRED]
  docs/architecture.md → README.md
- `CalendarDayButton()` --references--> `react`  [EXTRACTED]
  src/components/ui/calendar.tsx → package.json

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **API Contract Integration Agreement** — api_contract_api_contract, api_contract_node_template, api_contract_next_template, api_contract_success_envelope, api_contract_error_envelope [EXTRACTED 1.00]
- **Resource Framework Module Pattern** — readme_resource_framework, docs_adding_a_resource_task_module, docs_adding_a_resource_task_api_adapter, docs_adding_a_resource_task_resource_definition, docs_decision_guides_resource_decision_guide [INFERRED 0.85]
- **React Architecture State and Boundary Pattern** — docs_architecture_server_client_boundaries, docs_architecture_url_source_of_truth, docs_architecture_caching_strategy, docs_decision_guides_react_architecture_decision_guide [INFERRED 0.85]

## Communities (70 total, 31 thin omitted)

### Community 0 - "Ts / Resource Types Ts"
Cohesion: 0.07
Nodes (75): useConfirm(), ForbiddenState(), NotFoundState(), BreadcrumbEntry, PageHeader(), collectFilterKeys(), collectMultiValueKeys(), clearFormError() (+67 more)

### Community 1 - "Session Ts / Auth Context Tsx"
Cohesion: 0.05
Nodes (61): CreateUserPage(), metadata, EditUserPage(), metadata, metadata, UserDetailPage(), metadata, UsersPage() (+53 more)

### Community 2 - "Ts / Error State Tsx"
Cohesion: 0.07
Nodes (42): bodySchema, POST(), ErrorState(), ErrorStateProps, InlineError(), ApplyApiErrorsOptions, ApplyApiErrorsResult, applyApiErrorsToForm() (+34 more)

### Community 3 - "Ts / Column Helpers Tsx"
Cohesion: 0.07
Nodes (56): humanize(), StatusBadge(), StatusBadgeProps, StatusMap, StatusTone, TONE_CLASSES, baseColumn(), BaseColumnOptions (+48 more)

### Community 4 - "Ts / Api Client Ts"
Cohesion: 0.08
Nodes (37): RFC-5987, ApiClient, ApiClientConfig, buildUrl(), createApiClient(), HttpMethod, QueryParams, QueryValue (+29 more)

### Community 5 - "Ts / User Resource Ts"
Cohesion: 0.09
Nodes (33): userApi, userColumns, identityFields, roleFields, userDetailSections, userFormDefaults, userFormSchema, UserFormValues (+25 more)

### Community 6 - "Dependencies / React"
Cohesion: 0.04
Nodes (46): class-variance-authority, clsx, cmdk, date-fns, @hookform/resolvers, lucide-react, next, next-themes (+38 more)

### Community 7 - "Dropdown Menu Tsx / User Menu Tsx"
Cohesion: 0.07
Nodes (33): DashboardPage(), AppSidebar(), OPTIONS, subscribeToNothing(), ThemeToggle(), UserMenu(), Avatar(), AvatarBadge() (+25 more)

### Community 8 - "Ts / Form Inputs Tsx"
Cohesion: 0.11
Nodes (32): FormAsyncCombobox(), FormCombobox(), DatePickerControl(), DateRangeValue, FormDatePicker(), FormDatePickerProps, FormDateRange(), FormDateRangeProps (+24 more)

### Community 9 - "Auth Cookies Ts / Server Api Ts"
Cohesion: 0.09
Nodes (28): POST(), POST(), GET(), handler(), HOP_BY_HOP, LoginPage(), DashboardLayout(), geistMono (+20 more)

### Community 10 - "Cn() / Command Tsx"
Cohesion: 0.10
Nodes (29): CommandDialog(), CommandSeparator(), CommandShortcut(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader() (+21 more)

### Community 11 - "Error Envelope / Next Template Web Client"
Cohesion: 0.07
Nodes (30): Response Envelope Rule, API Contract, Authentication Handshake, Direct and Proxy CORS Modes, Error Envelope, Field Errors, next-template Web Client, node-template API (+22 more)

### Community 12 - "Compileroptions / Include"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 13 - "Form Combobox Tsx / Form Multi Select Tsx"
Cohesion: 0.15
Nodes (23): AsyncCombobox(), AsyncComboboxProps, ComboboxOption, ComboboxPage, ComboboxControl(), FormAsyncComboboxProps, FormComboboxProps, SelectOption (+15 more)

### Community 14 - "Loading Tsx / Page Tsx"
Cohesion: 0.15
Nodes (18): metadata, MODULES, DetailLoading(), FormLoading(), LoadingButton(), LoadingButtonProps, RefreshingOverlay(), Spinner() (+10 more)

### Community 15 - "Components Json / Aliases"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 16 - "Confirm Dialog Tsx / Alert Dialog Tsx"
Cohesion: 0.14
Nodes (17): CLOSED, ConfirmContext, ConfirmDialog(), ConfirmDialogProps, ConfirmFn, ConfirmOptions, ConfirmState, AlertDialog() (+9 more)

### Community 17 - "Data Table Tsx / Table Tsx"
Cohesion: 0.15
Nodes (15): EmptyState(), EmptyStateProps, FilteredEmptyState(), DataTableColumnHeader(), DataTable(), renderHeader(), @tanstack/react-table, Table() (+7 more)

### Community 18 - "List Query Ts / Use List Query State"
Cohesion: 0.25
Nodes (14): DataTableColumnHeaderProps, ListQueryState, useListQueryState(), clampInt(), countActiveFilters(), getActiveFilters(), ListQueryConfig, parseListQuery() (+6 more)

### Community 19 - "Utils Ts / Page Header Tsx"
Cohesion: 0.18
Nodes (10): PageHeaderProps, Breadcrumb(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator() (+2 more)

### Community 20 - "Data Table Filters Tsx / Use Debounced Value Ts"
Cohesion: 0.18
Nodes (13): asString(), DataTableFilters(), DateFilterControl(), DateRangeFilterControl(), FilterControl(), MultiSelectFilterControl(), TextFilterControl(), toIso() (+5 more)

### Community 21 - "Proxy Ts / Proxy()"
Cohesion: 0.22
Nodes (14): BASE_COOKIE, config, continueWithTokens(), inFlightRefreshes, isPrefetch(), isPublicPath(), loginRedirect(), proxy() (+6 more)

### Community 22 - "Data Table Pagination Tsx / Select Tsx"
Cohesion: 0.20
Nodes (12): DataTablePaginationProps, Select(), SelectContent(), SelectGroup(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton() (+4 more)

### Community 23 - "Devdependencies / Eslint"
Cohesion: 0.15
Nodes (13): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prettier-plugin-tailwindcss, @testing-library/dom, @testing-library/jest-dom (+5 more)

### Community 24 - "Scripts / Build"
Cohesion: 0.15
Nodes (13): scripts, build, dev, format, format:check, generate:api, lint, start (+5 more)

### Community 25 - "Button Tsx / Button()"
Cohesion: 0.27
Nodes (5): RouteError(), metadata, Button(), buttonVariants, Calendar()

### Community 26 - "Data Table Toolbar Tsx / Listfilters"
Cohesion: 0.26
Nodes (10): DataTableProps, DataTableFiltersProps, columnLabel(), ColumnVisibilityMenu(), DataTableToolbar(), DataTableToolbarProps, CustomFilterProps, FilterDefinition (+2 more)

### Community 27 - "Filter Types Ts / Filterbase"
Cohesion: 0.42
Nodes (8): BooleanFilter, CustomFilter, DateFilter, DateRangeFilter, FilterBase, MultiSelectFilter, SelectFilter, TextFilter

### Community 28 - "Prettierrc Json / Plugins"
Cohesion: 0.25
Nodes (7): plugins, printWidth, semi, singleQuote, tabWidth, trailingComma, prettier-plugin-tailwindcss

### Community 29 - "Package Json / Name"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 31 - "Admin Console Template / Api Contract Md"
Cohesion: 0.67
Nodes (3): Admin Console Template, API-CONTRACT.md, Dependency Direction

### Community 32 - "Globe Icon / Svg Vector Image"
Cohesion: 0.67
Nodes (3): Globe Icon, SVG Vector Image, World Grid Meridians And Parallels

### Community 33 - "Browser Window / Title Bar Controls"
Cohesion: 1.00
Nodes (3): Browser Window, Title Bar Controls, Window Icon

## Knowledge Gaps
- **218 isolated node(s):** `semi`, `singleQuote`, `trailingComma`, `printWidth`, `tabWidth` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Cn() / Command Tsx` to `Ts / Resource Types Ts`, `Session Ts / Auth Context Tsx`, `Ts / Error State Tsx`, `Ts / Column Helpers Tsx`, `Dependencies / React`, `Dropdown Menu Tsx / User Menu Tsx`, `Ts / Form Inputs Tsx`, `Form Combobox Tsx / Form Multi Select Tsx`, `Loading Tsx / Page Tsx`, `Confirm Dialog Tsx / Alert Dialog Tsx`, `Data Table Tsx / Table Tsx`, `List Query Ts / Use List Query State`, `Utils Ts / Page Header Tsx`, `Data Table Filters Tsx / Use Debounced Value Ts`, `Data Table Pagination Tsx / Select Tsx`, `Button Tsx / Button()`, `Data Table Toolbar Tsx / Listfilters`?**
  _High betweenness centrality (0.304) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependencies / React` to `Package Json / Name`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `CalendarDayButton()` connect `Dependencies / React` to `Button Tsx / Button()`, `Cn() / Command Tsx`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **What connects `semi`, `singleQuote`, `trailingComma` to the rest of the system?**
  _218 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Ts / Resource Types Ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06870428422152561 - nodes in this community are weakly interconnected._
- **Should `Session Ts / Auth Context Tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.054069938289744345 - nodes in this community are weakly interconnected._
- **Should `Ts / Error State Tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06558118498417007 - nodes in this community are weakly interconnected._