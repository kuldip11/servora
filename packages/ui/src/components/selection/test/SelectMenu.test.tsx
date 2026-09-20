import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SelectMenu } from "../SelectMenu";

describe("SelectMenu", () => {
  const options = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
  ];
  it("opens and commits an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectMenu
        label="Choice"
        options={options}
        value={undefined}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Choice" }));
    const listbox = screen.getByRole("listbox");
    expect(listbox.style.maxHeight).toContain(
      "--radix-popover-content-available-height",
    );
    expect(listbox.style.overflowY).toBe("auto");
    fireEvent.wheel(listbox, { deltaY: 48 });
    expect(listbox.scrollTop).toBe(48);
    await user.click(screen.getByRole("option", { name: "Two" }));
    expect(onChange).toHaveBeenCalledWith("two");
  });
  it("shows errors accessibly", () => {
    render(
      <SelectMenu
        label="Choice"
        options={options}
        value={undefined}
        onChange={() => {}}
        error="Required"
      />,
    );
    expect(screen.getByRole("combobox", { name: "Choice" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
  it("marks required menu selects visually and semantically", () => {
    render(
      <SelectMenu
        label="Choice"
        required
        options={options}
        value={undefined}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("*")).toBeVisible();
    expect(screen.getByRole("combobox", { name: /Choice/ })).toHaveAttribute(
      "aria-required",
      "true",
    );
  });
});
