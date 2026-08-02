import { describe, expect, it, vi } from "vitest";
import type { FieldValues, UseFormReturn } from "react-hook-form";

import { ApiError } from "@/lib/errors";

import { applyApiErrorsToForm, fieldPathsFromShape, normalizePath } from "./apply-api-errors";

/**
 * A minimal stand-in for `UseFormReturn`. Only `setError` and `clearErrors` are
 * exercised, and asserting on those calls is a more direct test of the mapping
 * than rendering a form and reading the DOM.
 */
function makeFormStub() {
  const setError = vi.fn();
  const clearErrors = vi.fn();

  return {
    form: { setError, clearErrors } as unknown as UseFormReturn<FieldValues>,
    setError,
    clearErrors,
  };
}

describe("normalizePath", () => {
  it("converts array indices to dot notation", () => {
    expect(normalizePath("contacts[0].phone")).toBe("contacts.0.phone");
  });

  it("keeps nested object paths as they are", () => {
    expect(normalizePath("address.city")).toBe("address.city");
  });

  it("strips a request-body prefix", () => {
    expect(normalizePath("body.email")).toBe("email");
    expect(normalizePath("data.address.city")).toBe("address.city");
  });
});

describe("applyApiErrorsToForm", () => {
  it("moves a field error onto its input", () => {
    const { form, setError } = makeFormStub();

    applyApiErrorsToForm(
      new ApiError({
        status: 422,
        message: "Validation failed",
        errors: [{ path: "email", message: "Email already exists" }],
      }),
      form,
    );

    expect(setError).toHaveBeenCalledWith(
      "email",
      { type: "server", message: "Email already exists" },
      { shouldFocus: true },
    );
  });

  it("focuses only the first errored field", () => {
    const { form, setError } = makeFormStub();

    applyApiErrorsToForm(
      new ApiError({
        status: 422,
        message: "Validation failed",
        errors: [
          { path: "email", message: "Taken" },
          { path: "npi", message: "Too short" },
        ],
      }),
      form,
    );

    expect(setError.mock.calls[0]?.[2]).toEqual({ shouldFocus: true });
    expect(setError.mock.calls[1]?.[2]).toEqual({ shouldFocus: false });
  });

  it("normalizes nested paths on the way in", () => {
    const { form, setError } = makeFormStub();

    applyApiErrorsToForm(
      new ApiError({
        status: 422,
        message: "Invalid",
        errors: [{ path: "body.address[0].city", message: "Required" }],
      }),
      form,
    );

    expect(setError.mock.calls[0]?.[0]).toBe("address.0.city");
  });

  it("routes an error for a field the form does not render to form level", () => {
    const { form, setError } = makeFormStub();

    const result = applyApiErrorsToForm(
      new ApiError({
        status: 422,
        message: "Invalid",
        errors: [{ path: "internalRiskScore", message: "Out of range" }],
      }),
      form,
      { knownFields: ["email", "npi"] },
    );

    // Attaching this to a hidden field would block submission with an error the
    // user can never see or fix.
    expect(result.unmatched).toHaveLength(1);
    expect(setError).toHaveBeenCalledWith(
      "root.serverError",
      expect.objectContaining({ type: "server" }),
    );
  });

  it("shows a form-level message when there are no field errors at all", () => {
    const { form, setError } = makeFormStub();

    applyApiErrorsToForm(
      new ApiError({
        status: 409,
        code: "CONFLICT",
        message: "This record conflicts with another",
      }),
      form,
    );

    expect(setError).toHaveBeenCalledWith("root.serverError", {
      type: "server",
      message: "This record conflicts with another",
    });
  });

  it("handles a non-ApiError throw without crashing the submit handler", () => {
    const { form, setError } = makeFormStub();

    const result = applyApiErrorsToForm(new TypeError("boom"), form);

    expect(result.applied).toBe(true);
    expect(setError).toHaveBeenCalledWith("root.serverError", expect.anything());
  });
});

describe("fieldPathsFromShape", () => {
  it("lists top-level and one level of nested keys", () => {
    const paths = fieldPathsFromShape({
      name: {},
      address: { shape: { city: {}, state: {} } },
    });

    expect(paths).toEqual(["name", "address", "address.city", "address.state"]);
  });
});
