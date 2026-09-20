import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFormApiErrors } from "./useFormApiErrors";

const mocks = vi.hoisted(() => ({
  applyApiFieldErrors: vi.fn(),
  extractApiError: vi.fn(),
  extractApiFieldErrors: vi.fn(),
}));

vi.mock("@/shared/lib/form-errors", () => ({
  applyApiFieldErrors: mocks.applyApiFieldErrors,
}));
vi.mock("@/shared/lib/api-client", () => ({
  extractApiError: mocks.extractApiError,
  extractApiFieldErrors: mocks.extractApiFieldErrors,
  toApiClientError: () => ({}),
}));

type Values = { name: string };

describe("useFormApiErrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractApiError.mockReturnValue("Request failed");
    mocks.extractApiFieldErrors.mockReturnValue({
      unknownField: ["Configuration is invalid"],
    });
  });

  it("keeps mapped field errors out of the form summary", () => {
    mocks.applyApiFieldErrors.mockReturnValue(true);
    const { result } = renderHook(() => useFormApiErrors<Values>());

    act(() => {
      result.current.handleApiError(
        new Error("bad"),
        vi.fn() as never,
        ["name"],
        "Could not save",
      );
    });

    expect(result.current.formErrorMessages).toEqual([]);
  });

  it("shows unknown field errors in the form summary", () => {
    mocks.applyApiFieldErrors.mockImplementation(
      (_error: unknown, _setError: unknown, options: any) => {
        options.onUnknownFieldErrors(["Configuration is invalid"]);
        return false;
      },
    );
    const { result } = renderHook(() => useFormApiErrors<Values>());

    act(() => {
      result.current.handleApiError(
        new Error("bad"),
        vi.fn() as never,
        ["name"],
        "Could not save",
      );
    });

    expect(result.current.formErrorMessages).toEqual([
      "Configuration is invalid",
    ]);
  });

  it("falls back to the normalized API error when no field errors exist", () => {
    mocks.applyApiFieldErrors.mockReturnValue(false);
    const { result } = renderHook(() => useFormApiErrors<Values>());

    act(() => {
      result.current.handleApiError(
        new Error("bad"),
        vi.fn() as never,
        ["name"],
        "Could not save",
      );
    });

    expect(result.current.formErrorMessages).toEqual(["Request failed"]);
    act(() => result.current.clearFormErrors());
    expect(result.current.formErrorMessages).toEqual([]);
  });
});
