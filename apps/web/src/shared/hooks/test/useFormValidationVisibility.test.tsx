import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFormValidationVisibility } from "../useFormValidationVisibility";

describe("useFormValidationVisibility", () => {
  it("hides local errors until blur/touch while server errors remain immediate", () => {
    const { result } = renderHook(() => useFormValidationVisibility());

    expect(
      result.current.fieldError("name", undefined, "Required"),
    ).toBeUndefined();
    expect(
      result.current.fieldError("name", "Already exists", "Required"),
    ).toBe("Already exists");

    act(() => result.current.touchField("name"));
    expect(result.current.fieldError("name", undefined, "Required")).toBe(
      "Required",
    );
  });

  it("shows all local errors after submit and resets when the form is reopened", () => {
    const { result } = renderHook(() => useFormValidationVisibility());

    act(() => result.current.markSubmitted());
    expect(result.current.clientError("email", "Invalid email")).toBe(
      "Invalid email",
    );

    act(() => result.current.resetVisibility());
    expect(
      result.current.clientError("email", "Invalid email"),
    ).toBeUndefined();
  });
});
