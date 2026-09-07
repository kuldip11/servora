import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children, ...props }: any) => (
    <section {...props}>{children}</section>
  ),
  IconButton: ({ icon: Icon, ...props }: any) => (
    <button {...props}>
      <Icon />
    </button>
  ),
  Input: ({ label, error, ...props }: any) => (
    <label>
      {label}
      <input aria-label={label} {...props} />
      {error ? <span>{error}</span> : null}
    </label>
  ),
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Select: ({ label, options = [], ...props }: any) => (
    <label>
      {label}
      <select aria-label={label} {...props}>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

import { BranchFormModal } from "../BranchFormModal";

describe("BranchFormModal", () => {
  it("supports modes, validation, capability toggles and submit", () => {
    const setValue = vi.fn(),
      onClose = vi.fn(),
      onSubmit = vi.fn();
    const register = (name: string) => ({
      name,
      onChange: vi.fn(),
      onBlur: vi.fn(),
      ref: vi.fn(),
    });
    const form: any = {
      name: "",
      code: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
      address: "",
      phone: "",
      takeawayEnabled: false,
      deliveryEnabled: false,
      onlineEnabled: false,
      dineInEnabled: false,
      tablesEnabled: false,
    };
    const handleSubmit = (fn: any) => (event: any) => {
      event.preventDefault();
      fn(form);
    };
    const { rerender } = render(
      <BranchFormModal
        mode="add"
        open
        form={form}
        errors={{ name: { message: "Required", type: "required" } } as any}
        register={register as any}
        setValue={setValue as any}
        handleSubmit={handleSubmit as any}
        pending={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText("Select at least one order type.")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Dine-in/));
    fireEvent.click(screen.getByLabelText("Takeaway"));
    fireEvent.click(screen.getByLabelText("Delivery"));
    fireEvent.click(screen.getByLabelText("Online"));
    expect(setValue).toHaveBeenCalledWith("tablesEnabled", true, {
      shouldValidate: true,
    });
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.submit(
      screen.getByRole("button", { name: "Add Branch" }).closest("form")!,
    );
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
    rerender(
      <BranchFormModal
        mode="edit"
        open
        form={{ ...form, dineInEnabled: true }}
        errors={{}}
        register={register as any}
        setValue={setValue as any}
        handleSubmit={handleSubmit as any}
        pending
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText(/Turning dine-in off is blocked/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeTruthy();
  });
});
