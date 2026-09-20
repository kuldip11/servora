import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "../Select";

describe("Select", () => {
  const options = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
  ];
  it("renders label, options and selected value", () => {
    render(
      <Select
        label="Choice"
        value="two"
        options={options}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Choice")).toHaveValue("two");
    expect(screen.getByRole("option", { name: "One" })).toBeInTheDocument();
  });
  it("reports native selection changes and errors", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        label="Choice"
        options={options}
        onChange={onChange}
        error="Required"
      />,
    );
    await user.selectOptions(screen.getByLabelText("Choice"), "two");
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
  it("marks required selects visually and semantically", () => {
    render(
      <Select
        label="Choice"
        required
        options={options}
        value="one"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("*")).toBeVisible();
    expect(screen.getByLabelText(/Choice/)).toHaveAttribute(
      "aria-required",
      "true",
    );
  });
});
