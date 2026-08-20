import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { PERMISSIONS } from "@/constants/permissions";
import { renderWithProviders } from "@/test/utils";

import { PermissionGuard } from "./permission-guard";

describe("PermissionGuard", () => {
  it("renders children when the permission is granted", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.user.create}>
        <button>Create user</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.user.create] },
    );

    expect(screen.getByRole("button", { name: "Create user" })).toBeInTheDocument();
  });

  it("renders nothing when the permission is missing", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.user.create}>
        <button>Create user</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.user.view] },
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the fallback when provided", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.user.create} fallback={<p>No access</p>}>
        <button>Create user</button>
      </PermissionGuard>,
      { permissions: [] },
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
  });

  it("requires every permission when given an array", () => {
    renderWithProviders(
      <PermissionGuard permission={[PERMISSIONS.user.view, PERMISSIONS.user.delete]}>
        <button>Delete</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.user.view] },
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("passes when any one of `anyPermission` is granted", () => {
    renderWithProviders(
      <PermissionGuard anyPermission={[PERMISSIONS.user.edit, PERMISSIONS.user.delete]}>
        <button>Manage</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.user.delete] },
    );

    expect(screen.getByRole("button", { name: "Manage" })).toBeInTheDocument();
  });

  it("renders children when no permission is required", () => {
    renderWithProviders(
      <PermissionGuard>
        <button>Always visible</button>
      </PermissionGuard>,
      { permissions: [] },
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders nothing for a signed-out user", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.user.view}>
        <button>Users</button>
      </PermissionGuard>,
      { user: null },
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
