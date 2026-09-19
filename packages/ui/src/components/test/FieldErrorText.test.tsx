import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldErrorText } from "../form/FieldErrorText";

describe("FieldErrorText", () => {
  it("renders a field error when present", () => {
    render(<FieldErrorText id="name-error" message="Name is required" />);
    expect(screen.getByText("Name is required").id).toBe("name-error");
  });

  it("renders nothing without an error", () => {
    const { container } = render(<FieldErrorText />);
    expect(container).toBeEmptyDOMElement();
  });
});
