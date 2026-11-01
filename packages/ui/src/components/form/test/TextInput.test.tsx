import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextInput } from "../TextInput";

describe("TextInput", () => {
  it("renders label, hint and character count and accepts input", async () => {
    const user = userEvent.setup();
    render(
      <TextInput
        label="Name"
        hint="Your name"
        defaultValue="A"
        maxLength={10}
        showCharCount
      />,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    await user.type(input, "lice");
    expect(input).toHaveValue("Alice");
    expect(screen.getByText("5/10")).toBeVisible();
  });
  it("shows error and disables while loading", () => {
    render(<TextInput label="Email" error="Invalid" loading suffix="kg" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid");
  });
  it("marks required fields visually and semantically without marking optional fields", () => {
    const { rerender } = render(<TextInput label="Name" required />);
    expect(screen.getByText("*")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /Name/ })).toHaveAttribute(
      "aria-required",
      "true",
    );

    rerender(<TextInput label="Name" />);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).not.toHaveAttribute(
      "aria-required",
    );
  });
});
