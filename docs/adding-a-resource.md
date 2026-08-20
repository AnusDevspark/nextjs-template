# Adding a resource

A worked example: adding a **Task** module — a scheduled unit of work assigned
to a user.

The domain is deliberately dull; the point is the *shape*. This template ships
no business domain, so substitute your own nouns as you read. Task pairs with
the backend tutorial in `node-template/docs/adding-a-module.md` — build both and
they talk to each other.

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
| 8   | Does the DTO match the UI shape?                      | Skip the mapper                                                       | Write `toTask(dto)`                                                                     |
| 9   | Which permissions guard it?                           | Add them to `PERMISSIONS`                                             | —                                                                                              |
| 10  | Are there non-CRUD business actions?                  | `actions.custom` + a plain exported API function                      | —                                                                                              |

For Task, assume: standard CRUD, a table, one custom cell (a time range),
a custom form (it has a duration/end-time interaction), standard details, a
`{ data, meta }` envelope, a DTO that needs light mapping, and one business
action ("Cancel task").

---

## Step 1 — Permissions

`src/constants/permissions.ts`:

```ts
export const PERMISSIONS = {
  // …
  task: {
    view: "TASK_VIEW",
    create: "TASK_CREATE",
    edit: "TASK_EDIT",
    delete: "TASK_DELETE",
  },
} as const;
```

The `Permission` union updates automatically, so every reference is now
typo-checked.

---

## Step 2 — Types

`src/features/task/task.types.ts`:

```ts
import type { StatusMap } from "@/components/common/status-badge";
import type { BaseListQuery } from "@/lib/query/list-query";

export const TASK_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const taskStatusMap: StatusMap<TaskStatus> = {
  SCHEDULED: { tone: "info", label: "Scheduled" },
  COMPLETED: { tone: "success", label: "Completed" },
  CANCELLED: { tone: "muted", label: "Cancelled" },
  NO_SHOW: { tone: "danger", label: "No show" },
};

export interface Task {
  id: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  teamId: string;
  startsAt: string;
  endsAt: string;
  status: TaskStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  assigneeId: string;
  teamId: string;
  startsAt: string;
  durationMinutes: number;
  reason?: string | null;
}

export type UpdateTaskInput = Partial<CreateTaskInput>;

export type TaskListQuery = BaseListQuery & {
  status?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export const taskStatusOptions = TASK_STATUSES.map((value) => ({
  value,
  label: taskStatusMap[value].label ?? value,
}));
```

The status map lives with the feature. `CANCELLED` means something different for
a task than for an invoice, and a global status registry would force one
meaning onto both.

---

## Step 3 — API adapter

`src/features/task/task.api.ts` — a **plain module**, no
`"use client"`, so a Server Component can also call it.

```ts
import { createResourceApi, toListResult, toQueryParams } from "@/framework/resource";

import type {
  Task,
  TaskListQuery,
  CreateTaskInput,
  UpdateTaskInput,
} from "./task.types";

interface TaskEnvelope {
  data: TaskDto[];
  meta: { total: number; page: number; perPage: number };
}

interface TaskDto {
  id: string;
  requester: { name: string };
  user: { id: string; name: string };
  teamId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

function toTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.requester.name,
    assigneeId: dto.user.id,
    assigneeName: dto.user.name,
    teamId: dto.teamId,
    startsAt: dto.startsAt,
    endsAt: dto.endsAt,
    status: dto.status as Task["status"],
    reason: dto.reason,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const taskApi = createResourceApi<
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListQuery
>({
  list: async (query, { client, signal }) => {
    const response = await client.get<TaskEnvelope>("/tasks", {
      query: toQueryParams(query, { pageSize: "perPage" }),
      signal,
    });

    return toListResult(response.data.map(toTask), {
      page: response.meta.page,
      pageSize: response.meta.perPage,
      total: response.meta.total,
    });
  },

  getById: async (id, { client, signal }) => {
    const response = await client.get<{ data: TaskDto }>(`/tasks/${id}`, { signal });
    return toTask(response.data);
  },

  create: async (data, { client, signal }) => {
    const response = await client.post<{ data: TaskDto }>("/tasks", data, { signal });
    return toTask(response.data);
  },

  update: async (id, data, { client, signal }) => {
    const response = await client.patch<{ data: TaskDto }>(`/tasks/${id}`, data, {
      signal,
    });
    return toTask(response.data);
  },

  remove: async (id, { client, signal }) => {
    await client.delete(`/tasks/${id}`, { signal });
  },
});

/** A business action, not CRUD — an ordinary exported function. */
export async function cancelTask(
  id: string,
  reason: string,
  client: Parameters<typeof taskApi.getById>[1]["client"],
): Promise<void> {
  await client.post(`/tasks/${id}/cancel`, { reason });
}
```

---

## Step 4 — Schema

`src/features/task/task.schema.ts`:

```ts
import { z } from "zod";

export const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  assigneeId: z.string().min(1, "Select a user"),
  teamId: z.string().min(1, "Select a team"),
  startsAt: z.string().min(1, "Select a start time"),
  durationMinutes: z.number().int().min(5).max(480),
  reason: z.string().max(500).optional().default(""),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

export const taskFormDefaults: TaskFormValues = {
  title: "",
  assigneeId: "",
  teamId: "",
  startsAt: "",
  durationMinutes: 30,
  reason: "",
};
```

Validate what the user can see and fix. "Does this user already have an
task at 09:00?" is the backend's answer, and it arrives as an `ApiError`
that the framework maps onto the right field.

---

## Step 5 — Columns

`src/features/task/task.columns.tsx` — `"use client"`, because
cells are components.

```tsx
"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { StatusBadge } from "@/components/common/status-badge";
import { createStatusColumn, createTextColumn } from "@/components/data-table";
import { formatDateTime } from "@/lib/formatters";

import { taskStatusMap, type Task } from "./task.types";

export const taskColumns: ColumnDef<Task, unknown>[] = [
  createTextColumn<Task>({
    id: "title",
    header: "Title",
    sortField: "title",
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

  createTextColumn<Task>({
    id: "assigneeName",
    header: "User",
    sortField: "assigneeName",
    truncate: true,
  }),

  createStatusColumn<Task, Task["status"]>({
    id: "status",
    header: "Status",
    sortField: "status",
    map: taskStatusMap,
  }),
];
```

---

## Step 6 — Resource definition

`src/features/task/task.resource.ts` — `"use client"`.

```ts
"use client";

import { XCircleIcon } from "lucide-react";

import { dateTimeField, textField, type DetailSection } from "@/components/detail-view";
import { PERMISSIONS } from "@/constants/permissions";
import { defineResource } from "@/framework/resource";
import { clientApi } from "@/lib/api";

import { TaskForm } from "./components/task-form";
import { taskApi, cancelTask } from "./task.api";
import { taskColumns } from "./task.columns";
import { taskFormDefaults, taskFormSchema } from "./task.schema";
import { taskStatusOptions, type Task } from "./task.types";

const sections: DetailSection<Task>[] = [
  {
    title: "Task",
    fields: [
      textField<Task>("Title", (a) => a.title),
      textField<Task>("User", (a) => a.assigneeName),
      dateTimeField<Task>("Starts", (a) => a.startsAt),
      dateTimeField<Task>("Ends", (a) => a.endsAt),
      textField<Task>("Reason", (a) => a.reason),
    ],
  },
];

export const taskResource = defineResource({
  key: "task",
  name: "Task",
  pluralName: "Tasks",
  description: "Scheduled units of work assigned to a user.",

  getId: (a: Task) => a.id,
  getLabel: (a: Task) => `${a.title} — ${a.assigneeName}`,

  routes: {
    list: "/tasks",
    create: "/tasks/create",
    detail: (id) => `/tasks/${id}`,
    edit: (id) => `/tasks/${id}/edit`,
  },

  permissions: PERMISSIONS.task,
  api: taskApi,

  list: {
    columns: taskColumns,
    filters: [
      { key: "status", type: "select", label: "Status", options: taskStatusOptions },
      { key: "date", type: "date-range", label: "Date" },
    ],
    defaultSort: { field: "startsAt", order: "desc" },
    searchPlaceholder: "Search by title or assignee…",
  },

  form: {
    schema: taskFormSchema,
    defaultValues: taskFormDefaults,
    component: TaskForm, // start/duration interact — Mode 2
  },

  details: { sections },

  actions: {
    custom: [
      {
        key: "cancel",
        label: "Cancel task",
        icon: XCircleIcon,
        permission: PERMISSIONS.task.edit,
        variant: "destructive",
        visible: (a) => a.status === "SCHEDULED",
        confirm: (a) => ({
          title: "Cancel task?",
          description: `${a.title}'s task will be cancelled and the slot released.`,
          confirmLabel: "Cancel task",
          destructive: true,
        }),
        onClick: async (a, { refresh }) => {
          await cancelTask(a.id, "Cancelled from list", clientApi);
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

`src/features/task/index.ts`:

```ts
export { taskResource } from "./task.resource";
export { taskApi, cancelTask } from "./task.api";
export {
  taskStatusMap,
  taskStatusOptions,
  type Task,
  type TaskStatus,
  type TaskListQuery,
} from "./task.types";
export {
  taskFormSchema,
  taskFormDefaults,
  type TaskFormValues,
} from "./task.schema";
```

---

## Step 8 — Routes

Four files, each 3–8 lines.

`src/app/(dashboard)/tasks/page.tsx`:

```tsx
import type { Metadata } from "next";

import { PERMISSIONS } from "@/constants/permissions";
import { taskResource } from "@/features/task";
import { ResourceListPage } from "@/framework/resource";
import { requirePermission } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  await requirePermission(PERMISSIONS.task.view, { returnTo: "/tasks" });

  return <ResourceListPage resource={taskResource} />;
}
```

`create/page.tsx`, `[id]/page.tsx` and `[id]/edit/page.tsx` follow the same
shape with `ResourceCreatePage`, `ResourceDetailPage` and `ResourceEditPage`.
Remember that `params` is a Promise in Next.js 16:

```tsx
export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requirePermission(PERMISSIONS.task.view, { returnTo: `/tasks/${id}` });

  return <ResourceDetailPage resource={taskResource} id={id} />;
}
```

---

## Step 9 — Navigation

`src/config/navigation.ts`:

```ts
{
  title: "Tasks",
  href: "/tasks",
  icon: CalendarIcon,
  permission: PERMISSIONS.task.view,
  matchNested: true,
}
```

Users without `TASK_VIEW` never see the link.

---

## Step 10 — Tests

Test only what is specific to Task. Listing, pagination, filtering,
delete confirmation, permission gating and form error mapping are already
covered by the framework tests.

```ts
describe("task adapter", () => {
  it("flattens the requester and assignee relations", () => {
    /* … */
  });
});

describe("TaskForm", () => {
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
