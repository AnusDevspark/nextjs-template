# Adding a resource

A worked example: adding an **Appointment** module.

---

## Step 0 — Answer ten questions first

Deciding these before writing code is what keeps a module small. Most answers
are "the standard thing", and every "no" points at a specific escape hatch.

| #   | Question                                              | If yes                                                                | If no                                                                                          |
| --- | ----------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Is this standard CRUD?                                | Continue                                                              | Consider a plain feature folder with normal pages; you can still use every Level 1/2 component |
| 2   | Is the listing a table?                               | `ResourceListPage`                                                    | `list.component`, or a fully custom page                                                       |
| 3   | Do any cells need real presentation?                  | Hand-write those `ColumnDef`s                                         | Use `create*Column` helpers                                                                    |
| 4   | Is the form a grid of labelled inputs?                | `form.fields`                                                         | `form.component`                                                                               |
| 5   | Do create and edit differ materially?                 | `createComponent` / `editComponent`, or `createSchema` / `editSchema` | One `component` / `fields` and one `schema`                                                    |
| 6   | Is the detail page label/value pairs?                 | `details.sections`                                                    | `details.component`                                                                            |
| 7   | Does the backend response match `ResourceListResult`? | Map it directly                                                       | Normalize it in the adapter (that is what the adapter is for)                                  |
| 8   | Does the DTO match the UI shape?                      | Skip the mapper                                                       | Write `toAppointment(dto)`                                                                     |
| 9   | Which permissions guard it?                           | Add them to `PERMISSIONS`                                             | —                                                                                              |
| 10  | Are there non-CRUD business actions?                  | `actions.custom` + a plain exported API function                      | —                                                                                              |

For Appointment, assume: standard CRUD, a table, one custom cell (a time range),
a custom form (it has a duration/end-time interaction), standard details, a
`{ data, meta }` envelope, a DTO that needs light mapping, and one business
action ("Cancel appointment").

---

## Step 1 — Permissions

`src/constants/permissions.ts`:

```ts
export const PERMISSIONS = {
  // …
  appointment: {
    view: "APPOINTMENT_VIEW",
    create: "APPOINTMENT_CREATE",
    edit: "APPOINTMENT_EDIT",
    delete: "APPOINTMENT_DELETE",
  },
} as const;
```

The `Permission` union updates automatically, so every reference is now
typo-checked.

---

## Step 2 — Types

`src/features/appointment/appointment.types.ts`:

```ts
import type { StatusMap } from "@/components/common/status-badge";
import type { BaseListQuery } from "@/lib/query/list-query";

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const appointmentStatusMap: StatusMap<AppointmentStatus> = {
  SCHEDULED: { tone: "info", label: "Scheduled" },
  COMPLETED: { tone: "success", label: "Completed" },
  CANCELLED: { tone: "muted", label: "Cancelled" },
  NO_SHOW: { tone: "danger", label: "No show" },
};

export interface Appointment {
  id: string;
  patientName: string;
  providerId: string;
  providerName: string;
  facilityId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  patientName: string;
  providerId: string;
  facilityId: string;
  startsAt: string;
  durationMinutes: number;
  reason?: string | null;
}

export type UpdateAppointmentInput = Partial<CreateAppointmentInput>;

export type AppointmentListQuery = BaseListQuery & {
  status?: string;
  providerId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const appointmentStatusOptions = APPOINTMENT_STATUSES.map((value) => ({
  value,
  label: appointmentStatusMap[value].label ?? value,
}));
```

The status map lives with the feature. `CANCELLED` means something different for
an appointment than for an invoice, and a global status registry would force one
meaning onto both.

---

## Step 3 — API adapter

`src/features/appointment/appointment.api.ts` — a **plain module**, no
`"use client"`, so a Server Component can also call it.

```ts
import { createResourceApi, toListResult, toQueryParams } from "@/framework/resource";

import type {
  Appointment,
  AppointmentListQuery,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "./appointment.types";

interface AppointmentEnvelope {
  data: AppointmentDto[];
  meta: { total: number; page: number; perPage: number };
}

interface AppointmentDto {
  id: string;
  patient: { name: string };
  provider: { id: string; name: string };
  facilityId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

function toAppointment(dto: AppointmentDto): Appointment {
  return {
    id: dto.id,
    patientName: dto.patient.name,
    providerId: dto.provider.id,
    providerName: dto.provider.name,
    facilityId: dto.facilityId,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    status: dto.status as Appointment["status"],
    reason: dto.reason,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const appointmentApi = createResourceApi<
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentListQuery
>({
  list: async (query, { client, signal }) => {
    const response = await client.get<AppointmentEnvelope>("/appointments", {
      query: toQueryParams(query, { pageSize: "perPage" }),
      signal,
    });

    return toListResult(response.data.map(toAppointment), {
      page: response.meta.page,
      pageSize: response.meta.perPage,
      total: response.meta.total,
    });
  },

  getById: async (id, { client, signal }) => {
    const response = await client.get<{ data: AppointmentDto }>(`/appointments/${id}`, { signal });
    return toAppointment(response.data);
  },

  create: async (data, { client, signal }) => {
    const response = await client.post<{ data: AppointmentDto }>("/appointments", data, { signal });
    return toAppointment(response.data);
  },

  update: async (id, data, { client, signal }) => {
    const response = await client.patch<{ data: AppointmentDto }>(`/appointments/${id}`, data, {
      signal,
    });
    return toAppointment(response.data);
  },

  remove: async (id, { client, signal }) => {
    await client.delete(`/appointments/${id}`, { signal });
  },
});

/** A business action, not CRUD — an ordinary exported function. */
export async function cancelAppointment(
  id: string,
  reason: string,
  client: Parameters<typeof appointmentApi.getById>[1]["client"],
): Promise<void> {
  await client.post(`/appointments/${id}/cancel`, { reason });
}
```

---

## Step 4 — Schema

`src/features/appointment/appointment.schema.ts`:

```ts
import { z } from "zod";

export const appointmentFormSchema = z.object({
  patientName: z.string().min(1, "Patient name is required").max(120),
  providerId: z.string().min(1, "Select a provider"),
  facilityId: z.string().min(1, "Select a facility"),
  startsAt: z.string().min(1, "Select a start time"),
  durationMinutes: z.number().int().min(5).max(480),
  reason: z.string().max(500).optional().default(""),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export const appointmentFormDefaults: AppointmentFormValues = {
  patientName: "",
  providerId: "",
  facilityId: "",
  startsAt: "",
  durationMinutes: 30,
  reason: "",
};
```

Validate what the user can see and fix. "Does this provider already have an
appointment at 09:00?" is the backend's answer, and it arrives as an `ApiError`
that the framework maps onto the right field.

---

## Step 5 — Columns

`src/features/appointment/appointment.columns.tsx` — `"use client"`, because
cells are components.

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/status-badge";
import { createStatusColumn, createTextColumn } from "@/components/data-table";
import { formatDateTime } from "@/lib/formatters";

import { appointmentStatusMap, type Appointment } from "./appointment.types";

export const appointmentColumns: ColumnDef<Appointment, unknown>[] = [
  createTextColumn<Appointment>({
    id: "patientName",
    header: "Patient",
    sortField: "patientName",
    enableHiding: false,
  }),

  // Hand-written: a time range is two fields rendered as one thing.
  {
    id: "when",
    header: "When",
    meta: { sortField: "startsAt", label: "When" },
    cell: ({ row }) => (
      <div className="text-sm">
        <span className="block">{formatDateTime(row.original.startsAt)}</span>
        <span className="text-muted-foreground text-xs">
          until {formatDateTime(row.original.endsAt, { pattern: "HH:mm" })}
        </span>
      </div>
    ),
  },

  createTextColumn<Appointment>({
    id: "providerName",
    header: "Provider",
    sortField: "providerName",
    truncate: true,
  }),

  createStatusColumn<Appointment, Appointment["status"]>({
    id: "status",
    header: "Status",
    sortField: "status",
    map: appointmentStatusMap,
  }),
];
```

---

## Step 6 — Resource definition

`src/features/appointment/appointment.resource.ts` — `"use client"`.

```ts
"use client";

import { XCircleIcon } from "lucide-react";

import { dateTimeField, textField, type DetailSection } from "@/components/detail-view";
import { PERMISSIONS } from "@/constants/permissions";
import { defineResource } from "@/framework/resource";
import { clientApi } from "@/lib/api";

import { AppointmentForm } from "./components/appointment-form";
import { appointmentApi, cancelAppointment } from "./appointment.api";
import { appointmentColumns } from "./appointment.columns";
import { appointmentFormDefaults, appointmentFormSchema } from "./appointment.schema";
import { appointmentStatusOptions, type Appointment } from "./appointment.types";

const sections: DetailSection<Appointment>[] = [
  {
    title: "Appointment",
    fields: [
      textField<Appointment>("Patient", (a) => a.patientName),
      textField<Appointment>("Provider", (a) => a.providerName),
      dateTimeField<Appointment>("Starts", (a) => a.startsAt),
      dateTimeField<Appointment>("Ends", (a) => a.endsAt),
      textField<Appointment>("Reason", (a) => a.reason),
    ],
  },
];

export const appointmentResource = defineResource({
  key: "appointment",
  name: "Appointment",
  pluralName: "Appointments",
  description: "Scheduled visits between patients and providers.",

  getId: (a: Appointment) => a.id,
  getLabel: (a: Appointment) => `${a.patientName} — ${a.providerName}`,

  routes: {
    list: "/appointments",
    create: "/appointments/create",
    detail: (id) => `/appointments/${id}`,
    edit: (id) => `/appointments/${id}/edit`,
  },

  permissions: PERMISSIONS.appointment,
  api: appointmentApi,

  list: {
    columns: appointmentColumns,
    filters: [
      { key: "status", type: "select", label: "Status", options: appointmentStatusOptions },
      { key: "date", type: "date-range", label: "Date" },
    ],
    defaultSort: { field: "startsAt", order: "desc" },
    searchPlaceholder: "Search by patient or provider…",
  },

  form: {
    schema: appointmentFormSchema,
    defaultValues: appointmentFormDefaults,
    component: AppointmentForm, // start/duration interact — Mode 2
  },

  details: { sections },

  actions: {
    custom: [
      {
        key: "cancel",
        label: "Cancel appointment",
        icon: XCircleIcon,
        permission: PERMISSIONS.appointment.edit,
        variant: "destructive",
        visible: (a) => a.status === "SCHEDULED",
        confirm: (a) => ({
          title: "Cancel appointment?",
          description: `${a.patientName}'s appointment will be cancelled and the slot released.`,
          confirmLabel: "Cancel appointment",
          destructive: true,
        }),
        onClick: async (a, { refresh }) => {
          await cancelAppointment(a.id, "Cancelled from list", clientApi);
          refresh();
        },
      },
    ],
  },
});
```

Note the `date-range` filter: it writes `dateFrom` and `dateTo` to the URL, and
`getListQueryConfig` registers both keys automatically.

---

## Step 7 — Barrel

`src/features/appointment/index.ts`:

```ts
export { appointmentResource } from "./appointment.resource";
export { appointmentApi, cancelAppointment } from "./appointment.api";
export {
  appointmentStatusMap,
  appointmentStatusOptions,
  type Appointment,
  type AppointmentStatus,
  type AppointmentListQuery,
} from "./appointment.types";
export {
  appointmentFormSchema,
  appointmentFormDefaults,
  type AppointmentFormValues,
} from "./appointment.schema";
```

---

## Step 8 — Routes

Four files, each 3–8 lines.

`src/app/(dashboard)/appointments/page.tsx`:

```tsx
import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { appointmentResource } from "@/features/appointment";
import { ResourceListPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage() {
  await requirePermission(PERMISSIONS.appointment.view, { returnTo: "/appointments" });

  return <ResourceListPage resource={appointmentResource} />;
}
```

`create/page.tsx`, `[id]/page.tsx` and `[id]/edit/page.tsx` follow the same
shape with `ResourceCreatePage`, `ResourceDetailPage` and `ResourceEditPage`.
Remember that `params` is a Promise in Next.js 16:

```tsx
export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.appointment.view, { returnTo: `/appointments/${id}` });

  return <ResourceDetailPage resource={appointmentResource} id={id} />;
}
```

---

## Step 9 — Navigation

`src/config/navigation.ts`:

```ts
{
  title: "Appointments",
  href: "/appointments",
  icon: CalendarIcon,
  permission: PERMISSIONS.appointment.view,
  matchNested: true,
}
```

Users without `APPOINTMENT_VIEW` never see the link.

---

## Step 10 — Tests

Test only what is specific to Appointment. Listing, pagination, filtering,
delete confirmation, permission gating and form error mapping are already
covered by the framework tests.

```ts
describe("appointment adapter", () => {
  it("flattens the patient and provider relations", () => {
    /* … */
  });
});

describe("AppointmentForm", () => {
  it("derives the end time from start plus duration", () => {
    /* … */
  });
});
```

---

## Checklist

- [ ] `PERMISSIONS` entry
- [ ] `*.types.ts` — entity, status map, list query
- [ ] `*.api.ts` — adapter (plain module), DTO mapper only if the shapes differ
- [ ] `*.schema.ts` — Zod schema and defaults
- [ ] `*.columns.tsx` — `"use client"`
- [ ] `*.resource.ts` — `"use client"`
- [ ] `index.ts` barrel
- [ ] Four route files
- [ ] Navigation entry
- [ ] Tests for this feature's own behaviour only

---

## When _not_ to use the resource framework

Skip it when the module is not a resource:

- A dashboard of charts — it has no list, no form, no detail.
- A wizard-shaped onboarding flow.
- A report builder.
- A real-time monitoring board.

Build those as ordinary pages and components. They should still use the app
shell, `requirePermission`, the API client, `ApiError`, the form primitives,
dialogs and toasts. Reusing the _infrastructure_ without the _engines_ is a
supported outcome, not a workaround.
