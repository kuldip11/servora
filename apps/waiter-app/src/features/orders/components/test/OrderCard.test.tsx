import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OrderCard } from "@/features/orders/components/OrderCard";
import { order } from "./fixtures";

describe("OrderCard", () => {
  it("renders standard and compact variants", () => {
    expect(
      renderToStaticMarkup(<OrderCard order={order} onSelect={vi.fn()} />),
    ).toContain("3 items");
    expect(
      renderToStaticMarkup(
        <OrderCard order={order} onSelect={vi.fn()} variant="compact" />,
      ),
    ).toContain("3 items");
  });
});
