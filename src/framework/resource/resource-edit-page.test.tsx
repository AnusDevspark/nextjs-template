import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { PERMISSIONS } from "@/constants/permissions";
import { userResource } from "@/features/user/user.resource";
import { API_URL, makeUser, successEnvelope } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { routerMock } from "@/test/router-mock";
import { renderWithProviders } from "@/test/utils";

import { ResourceEditPage } from "./resource-edit-page";

const EDIT_PERMISSIONS = [PERMISSIONS.user.view, PERMISSIONS.user.edit];

/**
 * Tests for the edit engine.
 *
 * These cover the mechanics no feature should ever reimplement: loading the
 * record, the 404 case, mapping backend field errors onto inputs, and the
 * success path. The User resource is used because its form is
 * configuration-driven, so these also prove form Mode 1 renders and submits.
 *
 * Every stub below returns the real envelope — `{ success, data }` for reads,
 * `{ success, message, code, errors }` for failures. A test that stubbed a bare
 * object would pass while the app broke against the actual API.
 */
describe("ResourceEditPage", () => {
  it("loads the record and prefills the form", async () => {
    server.use(
      http.get(`${API_URL}/users/:id`, () => HttpResponse.json(successEnvelope(makeUser()))),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(await screen.findByDisplayValue("Ada")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lovelace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ada@example.com")).toBeInTheDocument();

    // The heading is titled with the record, via `getLabel`.
    expect(screen.getByRole("heading", { name: /edit ada lovelace/i })).toBeInTheDocument();
  });

  it("does not render a password field when editing", async () => {
    server.use(
      http.get(`${API_URL}/users/:id`, () => HttpResponse.json(successEnvelope(makeUser()))),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    await screen.findByDisplayValue("Ada");

    // The API's update schema has no password field; offering one would submit
    // a value that gets silently stripped.
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("shows a form skeleton while loading", () => {
    server.use(
      http.get(`${API_URL}/users/:id`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json(successEnvelope(makeUser()));
      }),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(screen.getByRole("status", { name: /loading form/i })).toBeInTheDocument();
  });

  it("shows a not-found state for a 404, with no retry offered", async () => {
    server.use(
      http.get(`${API_URL}/users/:id`, () =>
        HttpResponse.json(
          { success: false, message: "User not found", code: "NOT_FOUND" },
          { status: 404 },
        ),
      ),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="missing" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
    // Retrying a deleted record would never succeed, so no retry button.
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to users/i })).toBeInTheDocument();
  });

  it("offers a retry for a transient server error", async () => {
    server.use(
      http.get(`${API_URL}/users/:id`, () =>
        HttpResponse.json(
          { success: false, message: "Internal server error", code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("blocks the page without the edit permission", async () => {
    server.use(
      http.get(`${API_URL}/users/:id`, () => HttpResponse.json(successEnvelope(makeUser()))),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: [PERMISSIONS.user.view],
    });

    expect(await screen.findByText(/you do not have access/i)).toBeInTheDocument();
  });

  it("maps a backend field error onto the matching input", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API_URL}/users/:id`, () => HttpResponse.json(successEnvelope(makeUser()))),
      // PATCH, not PUT — the API has no PUT routes.
      http.patch(`${API_URL}/users/:id`, () =>
        HttpResponse.json(
          {
            success: false,
            code: "CONFLICT",
            message: "A user with this email already exists",
            // The API names the key `field`; `parse-api-error` accepts it
            // alongside `path`.
            errors: [{ field: "email", message: "This email is already in use" }],
          },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    await screen.findByDisplayValue("Ada");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // The message lands next to the input, not in a toast.
    expect(await screen.findByText("This email is already in use")).toBeInTheDocument();

    const emailInput = screen.getByDisplayValue("ada@example.com");
    expect(emailInput).toHaveAttribute("aria-invalid", "true");
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("submits changes with PATCH and navigates to the detail page on success", async () => {
    const user = userEvent.setup();
    let submitted: unknown;
    let method: string | undefined;

    server.use(
      http.get(`${API_URL}/users/:id`, () => HttpResponse.json(successEnvelope(makeUser()))),
      http.patch(`${API_URL}/users/:id`, async ({ request }) => {
        submitted = await request.json();
        method = request.method;
        return HttpResponse.json(successEnvelope(makeUser({ firstName: "Augusta" })));
      }),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    const firstNameInput = await screen.findByDisplayValue("Ada");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Augusta");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(submitted).toMatchObject({ firstName: "Augusta", email: "ada@example.com" }),
    );
    expect(method).toBe("PATCH");
    // Never sent: the update schema does not accept it.
    expect(submitted).not.toHaveProperty("password");

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith(
        "/users/11111111-1111-4111-8111-111111111111",
      ),
    );
  });

  it("blocks submission on client-side validation before calling the API", async () => {
    const user = userEvent.setup();
    let patchCalled = false;

    server.use(
      http.get(`${API_URL}/users/:id`, () => HttpResponse.json(successEnvelope(makeUser()))),
      http.patch(`${API_URL}/users/:id`, () => {
        patchCalled = true;
        return HttpResponse.json(successEnvelope(makeUser()));
      }),
    );

    renderWithProviders(<ResourceEditPage resource={userResource} id="u1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    const emailInput = await screen.findByDisplayValue("ada@example.com");
    await user.clear(emailInput);
    await user.type(emailInput, "not-an-email");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });
});
