import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/features/menu/hooks/useMenus", () => ({
  useUpdateMenu: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock("../MenuScheduleEditor", () => ({
  MenuScheduleEditor: ({ menuId }: any) => <div>schedule:{menuId}</div>,
}));
vi.mock("@pos/ui", () => ({
  Modal: ({ open, title, children }: any) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  Input: ({ label, ...p }: any) => (
    <label>
      {label}
      <input aria-label={label} {...p} />
    </label>
  ),
}));
import { MenuAvailabilityDialog } from "../MenuAvailabilityDialog";
const menu = (over: any = {}) =>
  ({
    id: "m1",
    name: "Weekend",
    availableChannels: null,
    availableFulfillmentTypes: null,
    availableBranchIds: null,
    effectiveFrom: null,
    ...over,
  }) as any;
describe("MenuAvailabilityDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("owns availability scopes and future-effective submission", () => {
    const close = vi.fn();
    render(
      <MenuAvailabilityDialog
        menu={menu()}
        branches={[
          { id: "b1", name: "North" },
          { id: "b2", name: "South" },
        ]}
        onClose={close}
      />,
    );
    expect(screen.getByText("schedule:m1")).toBeTruthy();
    const checks = screen.getAllByRole("checkbox");
    fireEvent.click(checks[0]!);
    fireEvent.click(screen.getByLabelText("North"));
    expect(screen.getByText(/Branch-specific items/)).toBeTruthy();
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
    fireEvent.change(screen.getByLabelText("Effective from (optional)"), {
      target: { value: future },
    });
    expect(screen.getByText(/Pending change/)).toBeTruthy();
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Save availability" })
        .closest("form")!,
    );
    expect(mocks.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "m1",
        input: expect.objectContaining({ effectiveFrom: expect.any(String) }),
      }),
      expect.any(Object),
    );
  });
  it("owns cancel action", () => {
    const close = vi.fn();
    render(
      <MenuAvailabilityDialog menu={menu()} branches={[]} onClose={close} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(close).toHaveBeenCalled();
  });
});
