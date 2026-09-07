import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Input: ({ "aria-label": label, value, onChange }: any) => (
    <input aria-label={label} value={value} onChange={onChange} />
  ),
  Button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
}));
import { ManualAvailabilityOverrideDialog } from "../ManualAvailabilityOverrideDialog";
describe("ManualAvailabilityOverrideDialog", () => {
  it("owns reason editing, validation and actions", () => {
    const change = vi.fn(),
      close = vi.fn(),
      submit = vi.fn();
    const { rerender } = render(
      <ManualAvailabilityOverrideDialog
        item={{ name: "Pizza" } as any}
        reason=""
        onReasonChange={change}
        onClose={close}
        onSubmit={submit}
      />,
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Mark out of stock",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Manual override reason"), {
      target: { value: "Sold out" },
    });
    expect(change).toHaveBeenCalledWith("Sold out");
    rerender(
      <ManualAvailabilityOverrideDialog
        item={{ name: "Pizza" } as any}
        reason="Sold out"
        onReasonChange={change}
        onClose={close}
        onSubmit={submit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark out of stock" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(submit).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });
});
