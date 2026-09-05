import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  assignItem: vi.fn(async () => ({})),
  removeItem: vi.fn(async () => ({})),
  invalidate: vi.fn(async () => ({})),
  error: vi.fn(),
  mutateRoute: vi.fn(),
}));

vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _loading, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  IconButton: ({ icon: Icon, ...props }: any) => <button {...props}><Icon /></button>,
  Input: ({ label, error, ...props }: any) => <label>{label}<input aria-label={label} {...props}/>{error ? <span>{error}</span> : null}</label>,
  Modal: ({ open, title, children }: any) => open ? <div role="dialog"><h2>{title}</h2>{children}</div> : null,
  Select: ({ label, options = [], ...props }: any) => <label>{label}<select aria-label={label} {...props}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));
vi.mock("@tanstack/react-query", () => ({
  useMutation: (config: any) => ({
    isPending: false,
    mutate: (arg: any) => Promise.resolve(config.mutationFn(arg)).then((value) => config.onSuccess?.(value, arg)).catch(config.onError),
  }),
}));
vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: h.invalidate } }));
vi.mock("@/shared/lib/notify", () => ({ notifyError: h.error }));
vi.mock("@/features/menu/hooks/useMenus", () => ({ useMenus: () => ({ data: [
  { id: "default", name: "Default", isDefault: true },
  { id: "m2", name: "Dinner", isDefault: false },
] }) }));
vi.mock("@/features/menu/services/menus.service", () => ({ menusService: { assignItem: h.assignItem, removeItem: h.removeItem } }));
vi.mock("@/features/menu/hooks/useKitchenStations", () => ({
  useKitchenStations: () => ({ data: [{ id: "s1", name: "Grill" }] }),
  useItemStationRoutes: () => ({ data: [{ stationId: "s1", modifierOptionId: null }] }),
  useSetItemStationRoute: () => ({ mutate: h.mutateRoute }),
}));

import { BranchCard } from "@/features/branches/components/BranchCard";
import { BranchFormModal } from "@/features/branches/components/BranchFormModal";
import { ItemAssociationsSection } from "../forms/ItemAssociationsSection";
import { ItemMediaVariantsSection } from "../forms/ItemMediaVariantsSection";
import { MenuMembershipsEditor } from "../forms/MenuMembershipsEditor";
import { StationRoutingEditor } from "../forms/StationRoutingEditor";

describe("previously uncovered simple components", () => {
  beforeEach(() => vi.clearAllMocks());

  it("covers branch card actions and capability states", () => {
    const onEdit = vi.fn();
    const onDeactivate = vi.fn();
    const branch: any = {
      id: "b1", name: "Central", code: "CTR", address: "Road 1", phone: "123", timezone: "Asia/Kolkata", currency: "INR",
      dineInEnabled: true, takeawayEnabled: false, deliveryEnabled: true, onlineEnabled: false, tablesEnabled: true,
    };
    render(<BranchCard branch={branch} onEdit={onEdit} onDeactivate={onDeactivate} />);
    expect(screen.getByText("Central")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Edit branch"));
    fireEvent.click(screen.getByLabelText("Deactivate branch"));
    expect(onEdit).toHaveBeenCalledWith(branch);
    expect(onDeactivate).toHaveBeenCalledWith(branch);
  });

  it("covers branch form modes, validation text, toggles and submit", () => {
    const setValue = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const register = (name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() });
    const form: any = { name: "", code: "", currency: "INR", timezone: "Asia/Kolkata", address: "", phone: "", takeawayEnabled: false, deliveryEnabled: false, onlineEnabled: false, dineInEnabled: false, tablesEnabled: false };
    const handleSubmit = (fn: any) => (event: any) => { event.preventDefault(); fn(form); };
    const { rerender } = render(<BranchFormModal mode="add" open form={form} errors={{ name: { message: "Required", type: "required" } } as any} register={register as any} setValue={setValue as any} handleSubmit={handleSubmit as any} pending={false} onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByText("Select at least one order type.")).toBeTruthy();
    fireEvent.click(screen.getByLabelText(/Dine-in/));
    fireEvent.click(screen.getByLabelText("Takeaway"));
    fireEvent.click(screen.getByLabelText("Delivery"));
    fireEvent.click(screen.getByLabelText("Online"));
    expect(setValue).toHaveBeenCalledWith("tablesEnabled", true, { shouldValidate: true });
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.submit(screen.getByRole("button", { name: "Add Branch" }).closest("form")!);
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
    rerender(<BranchFormModal mode="edit" open form={{ ...form, dineInEnabled: true }} errors={{}} register={register as any} setValue={setValue as any} handleSubmit={handleSubmit as any} pending onClose={onClose} onSubmit={onSubmit} />);
    expect(screen.getByText(/Turning dine-in off is blocked/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeTruthy();
  });

  it("covers media variants callbacks and association toggles", () => {
    const fns = Array.from({ length: 6 }, () => vi.fn());
    render(<ItemMediaVariantsSection imageUrls={["https://x.test/a.png"]} newImageUrl="" variants={[{ name: "Small", price: "10" }]} onNewImageUrl={fns[0]} onAddImage={fns[1]} onRemoveImage={fns[2]} onVariantChange={fns[3]} onRemoveVariant={fns[4]} onAddVariant={fns[5]} />);
    fireEvent.change(screen.getByPlaceholderText(/Paste an image URL/), { target: { value: "https://x.test/b.png" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByLabelText("Remove image 1"));
    fireEvent.change(screen.getByLabelText("Variant 1 name"), { target: { value: "Large" } });
    fireEvent.change(screen.getByLabelText("Variant 1 price"), { target: { value: "20" } });
    fireEvent.click(screen.getByLabelText("Remove variant 1"));
    fireEvent.click(screen.getByRole("button", { name: "+ Add variant" }));
    fns.forEach((fn) => expect(fn).toHaveBeenCalled());

    const toggle = vi.fn();
    render(<ItemAssociationsSection groups={[{ id: "g1", name: "Milk" } as any]} tags={[{ id: "t1", name: "Veg", color: null } as any]} allergens={[{ id: "a1", name: "Nuts" } as any]} selectedGroupIds={["g1"]} selectedTagIds={[]} selectedAllergenIds={["a1"]} toggle={toggle} />);
    fireEvent.click(screen.getByRole("button", { name: "Milk" }));
    fireEvent.click(screen.getByRole("button", { name: "Veg" }));
    fireEvent.click(screen.getByRole("button", { name: "Nuts" }));
    expect(toggle).toHaveBeenCalledTimes(3);
  });

  it("covers membership assignment/removal and station routing", async () => {
    const item: any = { id: "i1", menuMemberships: [{ menuId: "m2", categoryId: "c1" }] };
    const categories: any[] = [{ id: "c1", name: "Food" }, { id: "c2", name: "Drinks" }];
    render(<MenuMembershipsEditor item={item} categories={categories} />);
    expect(screen.getByText("Default Menu")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Dinner"), { target: { value: "c2" } });
    await waitFor(() => expect(h.assignItem).toHaveBeenCalledWith("i1", { menuId: "m2", categoryId: "c2" }));
    fireEvent.change(screen.getByLabelText("Dinner"), { target: { value: "" } });
    await waitFor(() => expect(h.removeItem).toHaveBeenCalledWith("i1", "m2"));

    render(<StationRoutingEditor itemId="i1" groups={[{ id: "g1", name: "Milk", options: [{ id: "o1", name: "Oat" }] } as any]} />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects.at(-2)!, { target: { value: "" } });
    fireEvent.change(selects.at(-1)!, { target: { value: "s1" } });
    expect(h.mutateRoute).toHaveBeenCalledWith({ stationId: null });
    expect(h.mutateRoute).toHaveBeenCalledWith({ stationId: "s1", modifierOptionId: "o1" });
  });
});
