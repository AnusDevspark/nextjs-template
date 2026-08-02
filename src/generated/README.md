# Generated API types

**Do not edit anything in this folder by hand.** It is overwritten by
`npm run generate:api`.

## Generating

```bash
npm run generate:api --spec=http://localhost:4000/openapi.json
# or from a file
npm run generate:api --spec=./openapi.yaml
```

That writes `src/generated/api-types.ts` using
[`openapi-typescript`](https://github.com/openapi-ts/openapi-typescript).

## Using generated types

Import the DTO and keep it inside the feature's adapter:

```ts
import type { components } from "@/generated/api-types";

type ProviderDto = components["schemas"]["Provider"];
```

Then map it to the view model in `provider.api.ts`, exactly as the hand-written
DTO is mapped today. Nothing above the adapter should import from
`src/generated/` — that is what keeps a backend schema change contained to one
file per resource.

## Why a view model as well as a DTO

Generated types describe the wire format. They are the right thing to validate
requests against, and the wrong thing to build a UI on when the two shapes
differ:

- Facility's DTO stores the address flat (`addressLine1`, `city`, …) while the
  form and detail page want a nested `address` object.
- Provider's DTO sends `credentials` as a comma-separated string.

Where the DTO already matches what the UI needs — Department is the example in
this repo — skip the view model and use the generated type directly. Writing a
mapper that copies fields one-to-one adds a file to maintain and buys nothing.

## Until the backend publishes a spec

The three example features declare their types by hand in `*.types.ts`. The
pipeline is wired and documented; switching over is a per-feature change to the
adapter, not an architectural one.
