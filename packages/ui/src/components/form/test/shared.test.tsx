import { render, screen, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  describedBy,
  FieldFooter,
  FieldLabel,
  fieldBaseClasses,
  useFieldIds,
} from "../shared";

describe("form shared helpers", () => {
  it("generates stable field ids and chooses error over hint", () => {
    const { result } = renderHook(() => useFieldIds("email"));
    expect(result.current).toEqual({
      fieldId: "email",
      hintId: "email-hint",
      errorId: "email-error",
    });
    expect(describedBy("hint", "error", "help", "bad")).toBe("error");
    expect(describedBy("hint", "error", "help")).toBe("hint");
    expect(describedBy("hint", "error")).toBeUndefined();
  });
  it("renders labels, errors, hints and character counts", () => {
    render(
      <>
        <FieldLabel htmlFor="name" required>
          Name
        </FieldLabel>
        <input id="name" aria-label="Name field" />
        <FieldFooter
          hint="Help"
          hintId="h"
          errorId="e"
          charCount={12}
          maxLength={10}
        />
      </>,
    );
    expect(screen.getByLabelText(/Name/)).toBeVisible();
    expect(screen.getByText("Help")).toBeVisible();
    expect(screen.getByText("12/10")).toHaveClass("text-danger");
    expect(fieldBaseClasses(true)).toContain("border-danger");
  });
});
