import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OrderDetailHeader } from "@/features/orders/components/OrderDetailHeader";
import { order } from "./fixtures";

describe("OrderDetailHeader", () => {
  it("renders table context", () => {
    expect(
      renderToStaticMarkup(
        <OrderDetailHeader order={order} onBack={vi.fn()} />,
      ),
    ).toContain("Table 7");
  });
});
