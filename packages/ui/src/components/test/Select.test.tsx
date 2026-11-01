import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Select } from "../Select";

describe("Select", () => {
  const options = [
    { value: "one", label: "One" },
    { value: "two", label: "Two" },
  ];

  it("opens and commits an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
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
      <Select
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
    expect(screen.getByRole("combobox", { name: /Choice/ })).toHaveAttribute(
      "aria-required",
      "true",
    );
  });

  it("forwards blur so form libraries can mark the field touched", async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(
      <Select
        label="Choice"
        options={options}
        value={undefined}
        onChange={() => {}}
        onBlur={onBlur}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "Choice" });
    await user.click(trigger);
    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });
});
