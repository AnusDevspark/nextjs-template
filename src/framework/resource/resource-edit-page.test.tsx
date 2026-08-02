import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { PERMISSIONS } from "@/constants/permissions";
import { departmentResource } from "@/features/department/department.resource";
import type { Department } from "@/features/department";
import { API_URL } from "@/test/msw/handlers";
import { server } from "@/test/msw/server";
import { routerMock } from "@/test/router-mock";
import { renderWithProviders } from "@/test/utils";

import { ResourceEditPage } from "./resource-edit-page";

const EDIT_PERMISSIONS = [PERMISSIONS.department.view, PERMISSIONS.department.edit];

function makeDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: "d1",
    name: "Cardiology",
    code: "CARD",
    facilityId: "f1",
    facilityName: "Central Hospital",
    headCount: 12,
    status: "ACTIVE",
    description: "Heart and vascular care",
    createdAt: "2024-01-01T10:00:00.000Z",
    updatedAt: "2024-06-01T10:00:00.000Z",
    ...overrides,
  };
}

/** The department form resolves its facility lookup label on mount. */
function facilityLookupHandler() {
  return http.get(`${API_URL}/facilities/:id`, () =>
    HttpResponse.json({
      data: {
        id: "f1",
        name: "Central Hospital",
        code: "CH-01",
        type: "HOSPITAL",
        status: "OPERATIONAL",
        addressLine1: "1 Main St",
        addressLine2: null,
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "United States",
        phone: null,
        email: null,
        bedCount: 200,
        departmentCount: 5,
        providerCount: 40,
        openedOn: "2000-01-01",
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
    }),
  );
}

/**
 * Tests for the edit engine.
 *
 * These cover the mechanics no feature should ever reimplement: loading the
 * record, the 404 case, mapping backend field errors onto inputs, and the
 * success path. Department is used because its form is configuration-driven, so
 * these also prove form Mode 1 renders and submits correctly.
 */
describe("ResourceEditPage", () => {
  it("loads the record and prefills the form", async () => {
    server.use(
      http.get(`${API_URL}/departments/:id`, () => HttpResponse.json(makeDepartment())),
      facilityLookupHandler(),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(await screen.findByDisplayValue("Cardiology")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CARD")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Heart and vascular care")).toBeInTheDocument();

    // The heading is titled with the record, via `getLabel`.
    expect(screen.getByRole("heading", { name: /edit cardiology/i })).toBeInTheDocument();
  });

  it("shows a form skeleton while loading", () => {
    server.use(
      http.get(`${API_URL}/departments/:id`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json(makeDepartment());
      }),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(screen.getByRole("status", { name: /loading form/i })).toBeInTheDocument();
  });

  it("shows a not-found state for a 404, with no retry offered", async () => {
    server.use(
      http.get(`${API_URL}/departments/:id`, () =>
        HttpResponse.json({ message: "Not found" }, { status: 404 }),
      ),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="missing" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(await screen.findByText(/department not found/i)).toBeInTheDocument();
    // Retrying a deleted record would never succeed, so no retry button.
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to departments/i })).toBeInTheDocument();
  });

  it("offers a retry for a transient server error", async () => {
    server.use(
      http.get(`${API_URL}/departments/:id`, () =>
        HttpResponse.json({ message: "boom" }, { status: 500 }),
      ),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("blocks the page without the edit permission", async () => {
    server.use(
      http.get(`${API_URL}/departments/:id`, () => HttpResponse.json(makeDepartment())),
      facilityLookupHandler(),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: [PERMISSIONS.department.view],
    });

    expect(await screen.findByText(/you do not have access/i)).toBeInTheDocument();
  });

  it("maps a backend field error onto the matching input", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(`${API_URL}/departments/:id`, () => HttpResponse.json(makeDepartment())),
      facilityLookupHandler(),
      http.put(`${API_URL}/departments/:id`, () =>
        HttpResponse.json(
          {
            code: "DEPARTMENT_CODE_EXISTS",
            message: "Validation failed",
            errors: [{ path: "code", message: "This code is already in use" }],
          },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    await screen.findByDisplayValue("Cardiology");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    // The message lands next to the input, not in a toast.
    expect(await screen.findByText("This code is already in use")).toBeInTheDocument();

    const codeInput = screen.getByDisplayValue("CARD");
    expect(codeInput).toHaveAttribute("aria-invalid", "true");
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("submits changes and navigates to the detail page on success", async () => {
    const user = userEvent.setup();
    let submitted: unknown;

    server.use(
      http.get(`${API_URL}/departments/:id`, () => HttpResponse.json(makeDepartment())),
      facilityLookupHandler(),
      http.put(`${API_URL}/departments/:id`, async ({ request }) => {
        submitted = await request.json();
        return HttpResponse.json(makeDepartment({ name: "Cardiac Care" }));
      }),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    const nameInput = await screen.findByDisplayValue("Cardiology");
    await user.clear(nameInput);
    await user.type(nameInput, "Cardiac Care");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(submitted).toMatchObject({ name: "Cardiac Care", code: "CARD" }));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/departments/d1"));
  });

  it("blocks submission on client-side validation before calling the API", async () => {
    const user = userEvent.setup();
    let putCalled = false;

    server.use(
      http.get(`${API_URL}/departments/:id`, () => HttpResponse.json(makeDepartment())),
      facilityLookupHandler(),
      http.put(`${API_URL}/departments/:id`, () => {
        putCalled = true;
        return HttpResponse.json(makeDepartment());
      }),
    );

    renderWithProviders(<ResourceEditPage resource={departmentResource} id="d1" />, {
      permissions: EDIT_PERMISSIONS,
    });

    // "cardiology" in lower case violates the uppercase code pattern.
    const codeInput = await screen.findByDisplayValue("CARD");
    await user.clear(codeInput);
    await user.type(codeInput, "lower");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/use 2–10 uppercase letters/i)).toBeInTheDocument();
    expect(putCalled).toBe(false);
  });
});
