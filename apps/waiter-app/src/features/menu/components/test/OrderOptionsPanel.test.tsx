import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  buildTableOptions,
  OrderOptionsPanel,
} from "@/features/menu/components/OrderOptionsPanel";

describe("OrderOptionsPanel", () => {
  it("renders order options", () => {
    const html = renderToStaticMarkup(
      <OrderOptionsPanel
        availableOrderTypes={[{ value: "DINE_IN", label: "Dine In" }] as any}
        orderType="DINE_IN"
        onOrderTypeChange={vi.fn()}
        tablesEnabled
        tables={[{ id: "t1", name: "Table 1" }] as any}
        tableId="t1"
        onTableChange={vi.fn()}
        customerId=""
        customerName="A"
        onClearCustomer={vi.fn()}
        customerSearch=""
        onCustomerSearchChange={vi.fn()}
        customerResults={[]}
        onSelectCustomer={vi.fn()}
        customerGroups={[]}
        customerGroupId=""
        onCustomerGroupChange={vi.fn()}
        billingMode="LINE_ITEMS"
        onBillingModeChange={vi.fn()}
        coverCount={1}
        onCoverCountChange={vi.fn()}
        perCoverRules={[]}
        perCoverPriceRuleId=""
        onPerCoverPriceRuleChange={vi.fn()}
      />,
    );
    expect(html).toContain("Dine In");
  });

  it("allows only available tables to be selected", () => {
    const options = buildTableOptions([
      {
        id: "free",
        name: "Table 1",
        capacity: 4,
        status: "AVAILABLE",
        isActive: true,
      },
      {
        id: "reserved",
        name: "Table 2",
        capacity: 2,
        status: "RESERVED",
        isActive: true,
      },
      {
        id: "occupied",
        name: "Table 3",
        capacity: 6,
        status: "OCCUPIED",
        isActive: true,
      },
    ] as any);
    expect(options.find((option) => option.value === "free")?.disabled).toBe(
      false,
    );
    expect(
      options.find((option) => option.value === "reserved")?.disabled,
    ).toBe(true);
    expect(
      options.find((option) => option.value === "occupied")?.disabled,
    ).toBe(true);
  });
});
