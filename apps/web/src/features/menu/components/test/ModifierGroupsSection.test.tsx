import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  groups: [] as any[],
  loading: false,
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/features/menu/hooks/useModifierGroups", () => ({ useModifierGroups: () => ({ data: mocks.groups, isLoading: mocks.loading }) }));
vi.mock("@/features/menu/hooks/useSaveModifierGroup", () => ({ useSaveModifierGroup: () => ({ isPending: false, mutate: mocks.save }) }));
vi.mock("@/features/menu/hooks/useDeleteModifierGroup", () => ({ useDeleteModifierGroup: () => ({ mutate: mocks.remove }) }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children }: any) => <section>{children}</section>,
  EmptyState: ({ title, description, action }: any) => <div><h3>{title}</h3><p>{description}</p>{action}</div>,
  Modal: ({ open, title, children, onClose }: any) => open ? <div role="dialog" aria-label={title}><h2>{title}</h2>{children}<button aria-label="modal-close" onClick={onClose}>x</button></div> : null,
  Input: React.forwardRef(({ label, error, ...props }: any, ref: any) => <label>{label}<input ref={ref} aria-label={props["aria-label"] ?? label} {...props}/>{error ? <span>{error}</span> : null}</label>),
  Select: ({ label, options = [], value, onChange }: any) => <label>{label}<select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o:any)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
  Spinner: () => <span>loading</span>,
  Badge: ({ children }: any) => <span>{children}</span>,
}));

import { ModifierGroupsSection } from "../ModifierGroupsSection";

const groups = [
  { id: "g1", name: "Sides", selectionType: "SINGLE", groupType: "SUBSTITUTION", minSelections: 1, maxSelections: 1, dependsOnOptionId: null, options: [
    { id: "11111111-1111-4111-8111-111111111111", name: "Fries", additionalPrice: "0", maxQuantity: 1, isDefault: true, isAvailable: true, replacesDefaultComponent: null },
    { id: "22222222-2222-4222-8222-222222222222", name: "Salad", additionalPrice: "25", maxQuantity: 2, isDefault: false, isAvailable: false, replacesDefaultComponent: "Fries" },
  ]},
  { id: "g2", name: "Extras", selectionType: "MULTIPLE", groupType: "ADDON", minSelections: 0, maxSelections: null, dependsOnOptionId: "11111111-1111-4111-8111-111111111111", options: [
    { id: "33333333-3333-4333-8333-333333333333", name: "Cheese", additionalPrice: 10, maxQuantity: 3, isDefault: false, isAvailable: true },
  ]},
] as any[];

describe("ModifierGroupsSection coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.groups = groups;
    mocks.loading = false;
    mocks.save.mockImplementation((_arg: any, options?: any) => options?.onSuccess?.());
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("renders loading, empty and populated modifier groups", () => {
    mocks.loading = true;
    const { rerender } = render(<ModifierGroupsSection />);
    expect(screen.getByText("loading")).toBeTruthy();
    mocks.loading = false;
    mocks.groups = [];
    rerender(<ModifierGroupsSection />);
    expect(screen.getByText("No modifier groups yet")).toBeTruthy();
    mocks.groups = groups;
    rerender(<ModifierGroupsSection />);
    expect(screen.getByText("Sides")).toBeTruthy();
    expect(screen.getByText("Pick one")).toBeTruthy();
    expect(screen.getByText("Required")).toBeTruthy();
    expect(screen.getByText("Pick multiple")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByText(/25/)).toBeTruthy();
  });

  it("creates a dependent multi-option group", async () => {
    render(<ModifierGroupsSection />);
    fireEvent.click(screen.getByRole("button", { name: /New Group/ }));
    fireEvent.change(screen.getByLabelText("Group name"), { target: { value: "  Sauces  " } });
    fireEvent.change(screen.getByLabelText("Group type"), { target: { value: "SUBSTITUTION" } });
    fireEvent.change(screen.getByLabelText("Selection"), { target: { value: "MULTIPLE" } });
    fireEvent.change(screen.getByLabelText("Min required"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Show only after option"), { target: { value: "11111111-1111-4111-8111-111111111111" } });
    fireEvent.change(screen.getByLabelText("Option 1 name"), { target: { value: " Mayo " } });
    fireEvent.change(screen.getByLabelText("Option 1 additional price"), { target: { value: "5" } });
    fireEvent.change(screen.getByLabelText("Option 1 max quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("+ Add option"));
    fireEvent.change(screen.getByLabelText("Option 2 name"), { target: { value: " Ketchup " } });
    fireEvent.change(screen.getByLabelText("Option 2 max quantity"), { target: { value: "1" } });
    fireEvent.click(screen.getAllByRole("checkbox")[0]!);
    fireEvent.change(screen.getAllByPlaceholderText("Replaces (e.g. Fries)")[0]!, { target: { value: "  Aioli  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create Group" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    const arg = mocks.save.mock.calls[0]![0];
    expect(arg.existingId).toBeNull();
    expect(arg.payload).toEqual(expect.objectContaining({ name: "Sauces", selectionType: "MULTIPLE", groupType: "SUBSTITUTION", minSelections: 1, dependsOnOptionId: "11111111-1111-4111-8111-111111111111" }));
    expect(arg.payload).not.toHaveProperty("maxSelections");
    expect(arg.payload.options).toEqual([
      expect.objectContaining({ name: "Mayo", additionalPrice: 5, maxQuantity: 2, isDefault: true, replacesDefaultComponent: "Aioli" }),
      expect.objectContaining({ name: "Ketchup", additionalPrice: 0, maxQuantity: 1, isDefault: false }),
    ]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("edits, removes, cancels and confirms deletion", async () => {
    render(<ModifierGroupsSection />);
    const iconButtons = screen.getAllByRole("button").filter((button) => !button.textContent?.trim());
    fireEvent.click(iconButtons[0]!);
    expect(screen.getByRole("dialog", { name: "Edit Modifier Group" })).toBeTruthy();
    expect((screen.getByLabelText("Group name") as HTMLInputElement).value).toBe("Sides");
    expect((screen.getByLabelText("Max allowed") as HTMLInputElement).value).toBe("1");
    expect((screen.getByLabelText("Show only after option") as HTMLSelectElement).querySelector('option[value="11111111-1111-4111-8111-111111111111"]')).toBeNull();
    fireEvent.change(screen.getByLabelText("Selection"), { target: { value: "MULTIPLE" } });
    fireEvent.change(screen.getByLabelText("Max allowed"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Show only after option"), { target: { value: "33333333-3333-4333-8333-333333333333" } });
    fireEvent.click(screen.getByLabelText("Remove option 2"));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0]![0]).toEqual(expect.objectContaining({ existingId: "g1", payload: expect.objectContaining({ maxSelections: 3, dependsOnOptionId: "33333333-3333-4333-8333-333333333333" }) }));

    const currentIcons = screen.getAllByRole("button").filter((button) => !button.textContent?.trim());
    fireEvent.click(currentIcons[2]!);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const afterCancel = screen.getAllByRole("button").filter((button) => !button.textContent?.trim());
    const confirmMock = vi.mocked(confirm);
    confirmMock.mockReturnValueOnce(true).mockReturnValueOnce(false);
    fireEvent.click(afterCancel[1]!);
    expect(mocks.remove).toHaveBeenCalledWith("g1");
    fireEvent.click(afterCancel[3]!);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
});
