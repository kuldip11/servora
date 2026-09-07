import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderTotals } from "@/features/orders/components/OrderTotals";
import { order } from "./fixtures";

describe("OrderTotals", () => {
  it("renders authoritative total", () => {
    expect(renderToStaticMarkup(<OrderTotals order={order} />)).toContain(
      "₹118.00",
    );
  });
});
