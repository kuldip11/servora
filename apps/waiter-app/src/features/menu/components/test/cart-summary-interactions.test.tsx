import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  BottomSheet: ({ children, footer, title, onClose }: any) => <section><h2>{title}</h2><button onClick={onClose}>close-sheet</button>{children}{footer}</section>,
  Button: ({ children, onClick, disabled }: any) => <button disabled={disabled} onClick={onClick}>{children}</button>,
  TextInput: ({ placeholder, value, onChange }: any) => <input aria-label={placeholder} value={value} onChange={onChange} />,
  SelectMenu: ({ label, onChange, options = [], "aria-label": aria }: any) => <label>{label}<select aria-label={aria ?? label} onChange={(e) => onChange(e.target.value)}>{options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>,
}));

import { CartSummary } from "@/features/menu/components/CartSummary";

const cart: any[] = [
  { menuItemId: "m1", name: "Burger", basePrice: 100, variantId: "v1", variantName: "Large", modifiers: [{ groupId: "g1", optionId: "o1", name: "Cheese", quantity: 2, zoneLabel: "LEFT" }], chefNotes: "hot", seatLabel: "A", course: 2, quantity: 2, unitPrice: 120, weightQuantity: 1.5, weightUnit: "KG", manualPrice: 99 },
  { menuItemId: "m2", name: "Fries", basePrice: 50, modifiers: [], chefNotes: "", seatLabel: "", course: 1, quantity: 1, unitPrice: 50 },
];
const combo: any = { id: "combo1", name: "Meal", pricePolicy: "FIXED", fixedPrice: 200, slots: [{ id: "slot1", minSelections: 1, maxSelections: 1, options: [{ menuItemId: "m2" }] }] };
const combos: any[] = [{ combo, quantity: 1, courseNumber: 3, selections: [{ slotId: "slot1", optionIds: ["m2"] }] }];
const menuById = new Map([["m2", { id: "m2", name: "Fries", basePrice: 50 } as any]]);

const makeProps = () => ({
  cart, combos, menuById, isAddingToExisting: false, courseSequencingAvailable: true, courseMode: true,
  onCourseModeChange: vi.fn(), roundCourseNumber: 1, onRoundCourseNumberChange: vi.fn(), onUpdateCourse: vi.fn(), onUpdateComboCourse: vi.fn(),
  orderNotes: "note", onOrderNotesChange: vi.fn(), couponCode: "SAVE", onCouponCodeChange: vi.fn(), promotions: [{ id: "p1", name: "Promo" }, { id: "p2", name: "Other" }], selectedPromotionIds: ["p1"], onTogglePromotion: vi.fn(),
  totalItems: 4, totalPrice: 490, isPending: false, needsTable: false, onUpdateQty: vi.fn(), onUpdateComboQty: vi.fn(), onEditItem: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn(),
});

describe("CartSummary interactions", () => {
  it("covers course sections, combos, edits, quantity and footer changes", () => {
    const props = makeProps();
    render(<CartSummary {...props} />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Promo"));
    fireEvent.change(screen.getByLabelText("Order notes…"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Coupon code (optional)"), { target: { value: "save2" } });
    fireEvent.click(screen.getByLabelText("Decrease quantity of Burger"));
    fireEvent.click(screen.getByLabelText("Increase quantity of Burger"));
    fireEvent.click(screen.getByLabelText("Decrease quantity of Meal"));
    fireEvent.click(screen.getByLabelText("Increase quantity of Meal"));
    fireEvent.click(screen.getAllByText("Edit choices")[0]!);
    fireEvent.change(screen.getByLabelText("Course for Burger"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Course for Meal"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Place Order"));
    expect(props.onCourseModeChange).toHaveBeenCalledWith(false);
    expect(props.onOrderNotesChange).toHaveBeenCalledWith("new");
    expect(props.onCouponCodeChange).toHaveBeenCalledWith("SAVE2");
    expect(props.onTogglePromotion).toHaveBeenCalledWith("p1");
    expect(props.onUpdateQty).toHaveBeenCalledTimes(2);
    expect(props.onUpdateComboQty).toHaveBeenCalledTimes(2);
    expect(props.onEditItem).toHaveBeenCalled();
    expect(props.onUpdateCourse).toHaveBeenCalled();
    expect(props.onUpdateComboCourse).toHaveBeenCalled();
    expect(props.onSubmit).toHaveBeenCalled();
  });

  it("covers existing-order round selection, pending and table-required states", () => {
    const props = { ...makeProps(), isAddingToExisting: true, isPending: true, needsTable: true };
    render(<CartSummary {...props} />);
    fireEvent.change(screen.getByLabelText("This round"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Notes for this round…"), { target: { value: "round" } });
    expect(screen.getByText("Placing…")).toBeTruthy();
    expect(screen.getByText(/Select a table/)).toBeTruthy();
    expect(props.onRoundCourseNumberChange).toHaveBeenCalledWith(2);
  });
});
