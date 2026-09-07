import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  BottomSheet: ({ children, footer, title }: any) => (
    <section>
      <h2>{title}</h2>
      {children}
      {footer}
    </section>
  ),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
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
  TextInput: ({ label: _label, ...props }: any) => <input {...props} />,
}));
import { CartSummary } from "@/features/menu/components/CartSummary";

const cart = [
  {
    menuItemId: "m1",
    name: "Burger",
    basePrice: 100,
    modifiers: [{ groupId: "g1", optionId: "o1", name: "Cheese", quantity: 2 }],
    chefNotes: "Hot",
    course: 1,
    quantity: 2,
    unitPrice: 120,
    variantId: "v1",
    variantName: "Large",
  },
] as any;

describe("CartSummary", () => {
  it("renders cart contents, totals and validation state", () => {
    const html = renderToStaticMarkup(
      <CartSummary
        cart={cart}
        combos={[]}
        menuById={new Map()}
        isAddingToExisting={false}
        courseSequencingAvailable={false}
        courseMode={false}
        onCourseModeChange={vi.fn()}
        roundCourseNumber={1}
        onRoundCourseNumberChange={vi.fn()}
        onUpdateCourse={vi.fn()}
        onUpdateComboCourse={vi.fn()}
        orderNotes="note"
        onOrderNotesChange={vi.fn()}
        couponCode=""
        onCouponCodeChange={vi.fn()}
        promotions={[]}
        selectedPromotionIds={[]}
        onTogglePromotion={vi.fn()}
        totalItems={2}
        totalPrice={240}
        isPending={false}
        needsTable
        onUpdateQty={vi.fn()}
        onUpdateComboQty={vi.fn()}
        onEditItem={vi.fn()}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(html).toContain("Burger");
    expect(html).toContain("₹240.00");
    expect(html).toContain("Select a table");
    expect(html).toContain("Edit choices");
  });
});
