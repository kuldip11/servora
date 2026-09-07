import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
      </section>
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
  SelectMenu: ({ label, options, onChange, ...props }: any) => (
    <label>
      {label}
      <select
        aria-label={label}
        {...props}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

import { ReasonDialog } from "@/features/orders/components/ReasonDialog";

describe("ReasonDialog", () => {
  it("submits predefined and free-text cancellation reasons", () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const reasons = [{ id: "r1", label: "Guest changed mind" }] as any;
    const { rerender } = render(
      <ReasonDialog
        open
        title="Cancel item"
        reasons={reasons}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Other reason"), {
      target: { value: "  kitchen mistake  " },
    });
    fireEvent.click(confirm);
    expect(onSubmit).toHaveBeenLastCalledWith({ reason: "kitchen mistake" });

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "r1" },
    });
    expect(screen.queryByLabelText("Other reason")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onSubmit).toHaveBeenLastCalledWith({
      cancellationReasonId: "r1",
      reason: "kitchen mistake",
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <ReasonDialog
        open={false}
        title="Cancel item"
        reasons={reasons}
        loading
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.queryByText("Cancel item")).toBeNull();
  });
});
