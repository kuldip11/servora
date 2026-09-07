import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OrderActions } from "@/features/orders/components/OrderActions";
import { order } from "./fixtures";

describe("OrderActions", () => {
  it("renders only available actions", () => {
    expect(
      renderToStaticMarkup(
        <OrderActions
          order={order}
          canRequestBill={false}
          canAddItems={false}
          canCancel={false}
          allTicketsServed={false}
          isUpdatingStatus={false}
          onRequestBill={vi.fn()}
          onAddItems={vi.fn()}
          onCancel={vi.fn()}
        />,
      ),
    ).toBe("");
    const html = renderToStaticMarkup(
      <OrderActions
        order={order}
        canRequestBill
        canAddItems
        canCancel
        allTicketsServed={false}
        isUpdatingStatus={false}
        onRequestBill={vi.fn()}
        onAddItems={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(html).toContain("Request Bill");
    expect(html).toContain("Add More Items");
    expect(html).toContain("Cancel Order");
  });
});
