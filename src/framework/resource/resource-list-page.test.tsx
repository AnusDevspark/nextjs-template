import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { PERMISSIONS } from "@/constants/permissions";
import { userResource } from "@/features/user/user.resource";
import type { User } from "@/features/user";
import { API_URL, makeUser, paginatedEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { lastReplacedSearchParams, routerMock, setSearchParams } from "@/test/router-mock";
import { renderWithProviders } from "@/test/utils";

import { ResourceListPage } from "./resource-list-page";

const ALL_USER_PERMISSIONS = [
  PERMISSIONS.user.view,
  PERMISSIONS.user.create,
  PERMISSIONS.user.edit,
  PERMISSIONS.user.delete,
];

/** Finds a row inside the table specifically, in case a card list is also rendered. */
async function findRowInTable(text: string): Promise<HTMLElement> {
  const table = await screen.findByRole("table");
  return within(table).findByText(text);
}

/**
 * Tests for the listing engine.
 *
 * These are the highest-value tests in the codebase: they cover behaviour that
 * every module inherits, so a regression here would otherwise surface as the
 * same bug in every feature at once. Because they run against the real User
 * resource, they also prove the definition format works end to end.
 *
 * Feature-level tests can then be short, and test only what is specific to that
 * feature — that is a large part of where the code reduction comes from.
 */
describe("ResourceListPage", () => {
  it("renders the resource's columns and rows", async () => {
    server.use(
      http.get(`${API_URL}/users`, () =>
        HttpResponse.json(
          paginatedEnvelope([
            makeUser({ id: "u1", firstName: "Ada", lastName: "Lovelace", fullName: "Ada Lovelace" }),
            makeUser({
              id: "u2",
              firstName: "Grace",
              lastName: "Hopper",
              fullName: "Grace Hopper",
              email: "grace@example.com",
            }),
          ]),
        ),
      ),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    expect(await findRowInTable("Ada Lovelace")).toBeInTheDocument();
    expect(await findRowInTable("Grace Hopper")).toBeInTheDocument();

    // Column headers come from the resource definition.
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();

    // A status column rendered a real badge, not a stringified value.
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("shows a skeleton while the first page loads", () => {
    server.use(
      http.get(`${API_URL}/users`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json(paginatedEnvelope([makeUser()]));
      }),
    );

    const { container } = renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("shows an empty state when there are no records", async () => {
    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope<User>([], { total: 0 }))),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    expect(await screen.findByText(/no users yet/i)).toBeInTheDocument();
  });

  it("distinguishes 'no results for these filters' from 'nothing exists'", async () => {
    setSearchParams("status=SUSPENDED");
    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope<User>([], { total: 0 }))),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    // Telling someone to "create their first user" when they simply typed a bad
    // filter is misleading.
    expect(await screen.findByText(/no users match your filters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("shows an error state with a retry when the request fails", async () => {
    server.use(
      http.get(`${API_URL}/users`, () =>
        HttpResponse.json(
          { success: false, message: "Upstream exploded", code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    // A 500 body must not be shown verbatim.
    expect(screen.queryByText(/upstream exploded/i)).not.toBeInTheDocument();
  });

  it("writes the page number to the URL when paging", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/users`, () =>
        HttpResponse.json(paginatedEnvelope([makeUser()], { total: 120 })),
      ),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /next page/i }));

    await waitFor(() => expect(routerMock.replace).toHaveBeenCalled());
    expect(lastReplacedSearchParams().get("page")).toBe("2");
  });

  it("resets to page 1 when the search term changes", async () => {
    const user = userEvent.setup();
    setSearchParams("page=4");
    server.use(
      http.get(`${API_URL}/users`, () =>
        HttpResponse.json(paginatedEnvelope([makeUser()], { total: 120 })),
      ),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");
    await user.type(screen.getByRole("searchbox"), "ada");

    // Debounced, so a real request is not fired per keystroke.
    await waitFor(() => expect(lastReplacedSearchParams().get("search")).toBe("ada"), {
      timeout: 2000,
    });
    expect(lastReplacedSearchParams().get("page")).toBeNull();
  });

  it("cycles sort order through the column header", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope([makeUser()]))),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    const header = screen.getByRole("columnheader", { name: /status/i });
    await user.click(within(header).getByRole("button"));

    await waitFor(() => expect(lastReplacedSearchParams().get("sortBy")).toBe("status"));
    expect(lastReplacedSearchParams().get("sortOrder")).toBe("asc");
  });

  it("hides the create button without the create permission", async () => {
    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope([makeUser()]))),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: [PERMISSIONS.user.view],
    });

    await findRowInTable("Ada Lovelace");
    expect(screen.queryByRole("link", { name: /new user/i })).not.toBeInTheDocument();
  });

  it("shows the create button with the create permission", async () => {
    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope([makeUser()]))),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");
    expect(screen.getByRole("link", { name: /new user/i })).toHaveAttribute(
      "href",
      "/users/create",
    );
  });

  it("requires confirmation before deleting, and does not call the API on cancel", async () => {
    const user = userEvent.setup();
    let deleteCalled = false;

    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope([makeUser()]))),
      http.delete(`${API_URL}/users/:id`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));
    await user.click(await screen.findByRole("menuitem", { name: /^delete$/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/permanently deleted/i)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(deleteCalled).toBe(false);
  });

  it("calls the delete endpoint once confirmed", async () => {
    const user = userEvent.setup();
    let deletedId: string | undefined;

    server.use(
      http.get(`${API_URL}/users`, () =>
        HttpResponse.json(paginatedEnvelope([makeUser({ id: "u9" })])),
      ),
      http.delete(`${API_URL}/users/:id`, ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));
    await user.click(await screen.findByRole("menuitem", { name: /^delete$/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deletedId).toBe("u9"));
  });

  it("omits the delete action without the delete permission", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/users`, () => HttpResponse.json(paginatedEnvelope([makeUser()]))),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: [PERMISSIONS.user.view],
    });

    await findRowInTable("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));

    expect(await screen.findByRole("menuitem", { name: /view details/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it("hides a custom action when its `visible` predicate fails", async () => {
    const user = userEvent.setup();

    // Declared here rather than on the shipped resource: custom row actions are
    // a framework feature every module can use, but User has no business need
    // for one, and inventing a "Suspend" button just to test the engine would
    // put fiction in the template.
    const resourceWithAction = {
      ...userResource,
      list: {
        ...userResource.list,
        actions: [
          {
            id: "suspend",
            label: "Suspend",
            onSelect: () => {},
            visible: (user: User) => user.status === "ACTIVE",
          },
        ],
      },
    } as typeof userResource;

    server.use(
      http.get(`${API_URL}/users`, () =>
        HttpResponse.json(paginatedEnvelope([makeUser({ status: "INACTIVE" })])),
      ),
    );

    renderWithProviders(<ResourceListPage resource={resourceWithAction} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));

    // "Suspend" only applies to an ACTIVE user.
    expect(screen.queryByRole("menuitem", { name: /suspend/i })).not.toBeInTheDocument();
  });

  it("sends the resource's default sort on the first request", async () => {
    let requestUrl = "";

    server.use(
      http.get(`${API_URL}/users`, ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(paginatedEnvelope([makeUser()]));
      }),
    );

    renderWithProviders(<ResourceListPage resource={userResource} />, {
      permissions: ALL_USER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    const params = new URL(requestUrl).searchParams;
    expect(params.get("sortBy")).toBe("createdAt");
    expect(params.get("sortOrder")).toBe("desc");
    // No rename map: the API already speaks `search`, `page` and `pageSize`.
    expect(params.get("page")).toBe("1");
  });
});
