<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working in this repository

An admin-console template: Next.js App Router, TanStack Query, shadcn/ui. **It has no
business domain.** The only resource it ships is `User`, which exists because
authentication needs it and because it is the worked example for adding your own.

Do not infer a domain from the code. If you are adding a feature, the domain comes from
the person asking — ask if it is not stated.

It talks to the companion `node-template` API. It ships no mock server; MSW is used in
tests only.

## Read first

- **`API-CONTRACT.md`** — the wire agreement with the API. Read it before touching an
  adapter, the auth route handlers, or anything that parses a response. The same file is
  committed to the backend repo; change both together.
- `docs/architecture.md` — the three levels of reuse and the dependency direction.

## Dependency direction

```
app → features → framework → components → lib
```

`framework/` and `components/` **never** import from `features/`. A violation here is how
a generic engine quietly becomes a feature-specific one.

## Rules that are not negotiable

- **Only `*.api.ts` may know the response envelope.** Everything above the adapter sees
  `ResourceListResult<T>` — `{ items, meta }`. When a backend shape is strange, it is
  absorbed there and nowhere else.
- **One error type.** `ApiError { status, code, message, errors, requestId }`, produced by
  `parseApiError`. Do not invent per-feature error shapes.
- **Field errors go into the form, never a toast.** `applyApiErrorsToForm` handles it.
- **Never show a 5xx body verbatim.** `getErrorMessage` decides what is safe to display.
- **Frontend permissions are UX only.** The backend is the security boundary; it re-checks
  everything. `src/constants/permissions.ts` mirrors the API's permission keys exactly.
- **Do not wrap API endpoints in Route Handlers or Server Actions.** The Node API is
  already the API. The handlers under `src/app/api/auth/` exist only because cookies must
  be set server-side.
- **Write a DTO → view-model mapper only when the shapes genuinely differ.** Consistency
  is not a reason to write a function that does nothing.
- **Update with `patch`, never `put`.** The API has no PUT routes.

## Adding a resource

Follow `docs/adding-a-resource.md`. A feature is:

```
<name>.types.ts     view model, create/update inputs, list query
<name>.api.ts       the adapter — the only file that sees the envelope
<name>.schema.ts    Zod form validation
<name>.columns.tsx  table columns
<name>.resource.ts  the definition that ties it together
```

Then add routes under `src/app/(dashboard)/<name>/` that gate with `requirePermission`
and delegate to the framework pages, and add a nav entry in `src/config/navigation.ts`.

## Verifying

```
npm run typecheck && npm run lint
npm run test                              # vitest + MSW, no backend needed
npx playwright test                       # smoke only, no backend needed
E2E_API_READY=true npx playwright test    # full suite, needs a seeded API
```

Start the API with `AUTH_RATE_LIMIT_MAX=100000` for the full suite — its default
credential rate limit is far too low for a run that logs in repeatedly.
