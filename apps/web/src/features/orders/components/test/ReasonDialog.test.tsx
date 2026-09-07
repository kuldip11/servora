import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
    </label>
  ),
}));

import { ReasonDialog } from "../ReasonDialog";

describe("ReasonDialog", () => {
  it("submits selected or custom cancellation reasons", () => {
    const submit = vi.fn();
    const close = vi.fn();
    const reasons = [{ id: "r1", label: "Mistake" }] as never;
    const { rerender } = render(
      <ReasonDialog
        open
        title="Reason"
        reasons={reasons}
        onClose={close}
        onSubmit={submit}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Other reason"), {
      target: { value: "  custom  " },
    });
    fireEvent.click(confirm);
    expect(submit).toHaveBeenCalledWith({ reason: "custom" });

    rerender(
      <ReasonDialog
        open
        title="Reason"
        reasons={reasons}
        onClose={close}
        onSubmit={submit}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "r1" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(submit).toHaveBeenLastCalledWith({
      cancellationReasonId: "r1",
      reason: "custom",
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(close).toHaveBeenCalled();
  });
});
