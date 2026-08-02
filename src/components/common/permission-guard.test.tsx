import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";

import { PERMISSIONS } from "@/constants/permissions";
import { renderWithProviders } from "@/test/utils";

import { PermissionGuard } from "./permission-guard";

describe("PermissionGuard", () => {
  it("renders children when the permission is granted", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.provider.create}>
        <button>Create provider</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.provider.create] },
    );

    expect(screen.getByRole("button", { name: "Create provider" })).toBeInTheDocument();
  });

  it("renders nothing when the permission is missing", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.provider.create}>
        <button>Create provider</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.provider.view] },
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the fallback when provided", () => {
    renderWithProviders(
      <PermissionGuard permission={PERMISSIONS.provider.create} fallback={<p>No access</p>}>
        <button>Create provider</button>
      </PermissionGuard>,
      { permissions: [] },
    );

    expect(screen.getByText("No access")).toBeInTheDocument();
  });

  it("requires every permission when given an array", () => {
    renderWithProviders(
      <PermissionGuard permission={[PERMISSIONS.provider.view, PERMISSIONS.provider.delete]}>
        <button>Delete</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.provider.view] },
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("passes when any one of `anyPermission` is granted", () => {
    renderWithProviders(
      <PermissionGuard anyPermission={[PERMISSIONS.provider.edit, PERMISSIONS.provider.delete]}>
        <button>Manage</button>
      </PermissionGuard>,
      { permissions: [PERMISSIONS.provider.delete] },
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
      <PermissionGuard permission={PERMISSIONS.provider.view}>
        <button>Providers</button>
      </PermissionGuard>,
      { user: null },
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
