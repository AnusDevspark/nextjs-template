import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { PERMISSIONS } from "@/constants/permissions";
import { providerResource } from "@/features/provider/provider.resource";
import { API_URL, makeProvider, providerListEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { lastReplacedSearchParams, routerMock, setSearchParams } from "@/test/router-mock";
import { renderWithProviders } from "@/test/utils";

import { ResourceListPage } from "./resource-list-page";

const ALL_PROVIDER_PERMISSIONS = [
  PERMISSIONS.provider.view,
  PERMISSIONS.provider.create,
  PERMISSIONS.provider.edit,
  PERMISSIONS.provider.delete,
];

/**
 * Finds a row inside the table specifically.
 *
 * Provider declares a `mobileRenderer`, so the engine renders a card list *and*
 * a table, with CSS choosing between them. jsdom applies no CSS, so both are
 * present and an unscoped query would match twice.
 */
async function findRowInTable(text: string): Promise<HTMLElement> {
  const table = await screen.findByRole("table");
  return within(table).findByText(text);
}

/**
 * Tests for the listing engine.
 *
 * These are the highest-value tests in the codebase: they cover behaviour that
 * every module inherits, so a regression here would otherwise surface as the
 * same bug in fifteen features at once. Because they run against the real
 * Provider resource, they also prove the definition format works end to end.
 *
 * Feature-level tests can then be short, and test only what is specific to that
 * feature — that is a large part of where the code reduction comes from.
 */
describe("ResourceListPage", () => {
  it("renders the resource's columns and rows", async () => {
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(
          providerListEnvelope(
            [
              makeProvider({ id: "p1", firstName: "Ada", lastName: "Lovelace" }),
              makeProvider({
                id: "p2",
                firstName: "Grace",
                lastName: "Hopper",
                email: "grace@example.com",
              }),
            ],
            2,
          ),
        ),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    expect(await findRowInTable("Ada Lovelace")).toBeInTheDocument();
    expect(await findRowInTable("Grace Hopper")).toBeInTheDocument();

    // Column headers come from the resource definition.
    expect(screen.getByRole("columnheader", { name: /provider/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();

    // A custom cell rendered a real component, not a stringified value.
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });

  it("shows a skeleton while the first page loads", () => {
    server.use(
      http.get(`${API_URL}/providers`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json(providerListEnvelope([makeProvider()]));
      }),
    );

    const { container } = renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
  });

  it("shows an empty state when there are no records", async () => {
    server.use(
      http.get(`${API_URL}/providers`, () => HttpResponse.json(providerListEnvelope([], 0))),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    expect(await screen.findByText(/no providers yet/i)).toBeInTheDocument();
  });

  it("distinguishes 'no results for these filters' from 'nothing exists'", async () => {
    setSearchParams("status=SUSPENDED");
    server.use(
      http.get(`${API_URL}/providers`, () => HttpResponse.json(providerListEnvelope([], 0))),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    // Telling someone to "create their first provider" when they simply typed a
    // bad filter is misleading.
    expect(await screen.findByText(/no providers match your filters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("shows an error state with a retry when the request fails", async () => {
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json({ message: "Upstream exploded" }, { status: 500 }),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    // A 500 body must not be shown verbatim.
    expect(screen.queryByText(/upstream exploded/i)).not.toBeInTheDocument();
  });

  it("writes the page number to the URL when paging", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 120)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
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
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 120)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
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
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 1)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    const header = screen.getByRole("columnheader", { name: /status/i });
    await user.click(within(header).getByRole("button"));

    await waitFor(() => expect(lastReplacedSearchParams().get("sortBy")).toBe("status"));
    expect(lastReplacedSearchParams().get("sortOrder")).toBe("asc");
  });

  it("hides the create button without the create permission", async () => {
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 1)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: [PERMISSIONS.provider.view],
    });

    await findRowInTable("Ada Lovelace");
    expect(screen.queryByRole("link", { name: /new provider/i })).not.toBeInTheDocument();
  });

  it("shows the create button with the create permission", async () => {
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 1)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");
    expect(screen.getByRole("link", { name: /new provider/i })).toHaveAttribute(
      "href",
      "/providers/create",
    );
  });

  it("requires confirmation before deleting, and does not call the API on cancel", async () => {
    const user = userEvent.setup();
    let deleteCalled = false;

    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 1)),
      ),
      http.delete(`${API_URL}/providers/:id`, () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
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
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider({ id: "p9" })], 1)),
      ),
      http.delete(`${API_URL}/providers/:id`, ({ params }) => {
        deletedId = String(params.id);
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));
    await user.click(await screen.findByRole("menuitem", { name: /^delete$/i }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deletedId).toBe("p9"));
  });

  it("omits the delete action without the delete permission", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider()], 1)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: [PERMISSIONS.provider.view],
    });

    await findRowInTable("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));

    expect(await screen.findByRole("menuitem", { name: /view details/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it("hides a custom action when its `visible` predicate fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/providers`, () =>
        HttpResponse.json(providerListEnvelope([makeProvider({ status: "INACTIVE" })], 1)),
      ),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");
    await user.click(screen.getByRole("button", { name: /actions for ada lovelace/i }));

    // "Deactivate" only applies to an ACTIVE provider.
    expect(screen.queryByRole("menuitem", { name: /deactivate/i })).not.toBeInTheDocument();
  });

  it("sends the resource's default sort on the first request", async () => {
    let requestUrl = "";

    server.use(
      http.get(`${API_URL}/providers`, ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(providerListEnvelope([makeProvider()], 1));
      }),
    );

    renderWithProviders(<ResourceListPage resource={providerResource} />, {
      permissions: ALL_PROVIDER_PERMISSIONS,
    });

    await findRowInTable("Ada Lovelace");

    const params = new URL(requestUrl).searchParams;
    expect(params.get("sortBy")).toBe("lastName");
    expect(params.get("sortOrder")).toBe("asc");
    // The adapter renames `search` to `q` for this backend.
    expect(params.has("search")).toBe(false);
  });
});
