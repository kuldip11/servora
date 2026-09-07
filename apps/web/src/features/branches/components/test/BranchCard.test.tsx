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

import { BranchCard } from "../BranchCard";

describe("BranchCard", () => {
  it("invokes edit and deactivate actions and renders capabilities", () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();
    const branch: any = {
      id: "b1",
      name: "Central",
      code: "CTR",
      address: "Road 1",
      phone: "123",
      timezone: "Asia/Kolkata",
      currency: "INR",
      dineInEnabled: true,
      takeawayEnabled: false,
      deliveryEnabled: true,
      onlineEnabled: false,
      tablesEnabled: true,
    };
    render(
      <BranchCard
        branch={branch}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
      />,
    );
    expect(screen.getByText("Central")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Edit branch"));
    fireEvent.click(screen.getByLabelText("Deactivate branch"));
    expect(onEdit).toHaveBeenCalledWith(branch);
    expect(onDeactivate).toHaveBeenCalledWith(branch);
  });
});
