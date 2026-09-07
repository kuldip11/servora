import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "@/features/orders/components/StatusBadge";

describe("StatusBadge", () => {
  it("renders known and fallback statuses", () => {
    expect(renderToStaticMarkup(<StatusBadge status="OPEN" />)).toContain(
      "Open",
    );
    expect(renderToStaticMarkup(<StatusBadge status="PAID" />)).toContain(
      "Paid",
    );
    expect(renderToStaticMarkup(<StatusBadge status="CUSTOM" />)).toContain(
      "CUSTOM",
    );
  });
});
