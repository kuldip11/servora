import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TabletOrderRail } from "@/features/menu/components/TabletOrderRail";

describe("TabletOrderRail", () => {
  it("renders current order totals", () => {
    const html = renderToStaticMarkup(
      <TabletOrderRail
        cart={[
          {
            menuItemId: "m1",
            name: "Burger",
            basePrice: 150,
            modifiers: [],
            quantity: 2,
            chefNotes: "",
            unitPrice: 150,
          },
        ]}
        combos={[]}
        totalItems={2}
        totalPrice={300}
        isAddingToExisting={false}
        onUpdateQty={vi.fn()}
        onUpdateComboQty={vi.fn()}
        onEditItem={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(html).toContain("Current order");
    expect(html).toContain("Burger");
    expect(html).toContain("₹300.00");
  });
});
