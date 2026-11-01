import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TextArea } from "../TextArea";

describe("TextArea", () => {
  it("accepts text and reports character count", async () => {
    const user = userEvent.setup();
    render(
      <TextArea label="Notes" defaultValue="Hi" maxLength={10} showCharCount />,
    );
    await user.type(screen.getByRole("textbox", { name: "Notes" }), "!");
    expect(screen.getByRole("textbox", { name: "Notes" })).toHaveValue("Hi!");
    expect(screen.getByText("3/10")).toBeVisible();
  });
  it("renders errors accessibly", () => {
    render(<TextArea label="Notes" error="Required" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
  it("marks required textareas visually and semantically", () => {
    render(<TextArea label="Notes" required />);
    expect(screen.getByText("*")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /Notes/ })).toHaveAttribute(
      "aria-required",
      "true",
    );
  });
});
