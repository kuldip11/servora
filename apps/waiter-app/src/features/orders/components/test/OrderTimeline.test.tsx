import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { order } from "./fixtures";

describe("OrderTimeline", () => {
  it("renders history and hides when empty", () => {
    expect(renderToStaticMarkup(<OrderTimeline order={order} />)).toContain(
      "Timeline",
    );
    expect(
      renderToStaticMarkup(
        <OrderTimeline order={{ ...order, statusHistory: [] }} />,
      ),
    ).toBe("");
  });
});
