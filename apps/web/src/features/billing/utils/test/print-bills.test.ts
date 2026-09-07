import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Bill, Order } from "@pos/types";
import { printBills } from "../print-bills";

const order = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "order-12345678",
    type: "DINE_IN",
    table: { name: "<VIP & 1>" },
    ...overrides,
  }) as unknown as Order;

const bill = (overrides: Record<string, unknown> = {}) =>
  ({
    subtotal: 100,
    taxAmount: 10,
    discountAmount: 5,
    serviceChargeAmount: 2,
    totalAmount: 107,
    splitLabel: 'Main "Bill"',
    payments: [
      { status: "SUCCESS", amount: 50 },
      { status: "FAILED", amount: 999 },
    ],
    itemAssignments: [
      { orderItem: { menuItemName: "Paneer <Tikka>", quantity: 2 } },
      { orderItem: null },
    ],
    ...overrides,
  }) as unknown as Bill;

describe("printBills", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does nothing when no bills are selected", () => {
    const open = vi.spyOn(window, "open");
    printBills(order(), []);
    expect(open).not.toHaveBeenCalled();
  });

  it("throws when the print popup is blocked", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(() => printBills(order(), [bill()])).toThrow("Allow pop-ups");
  });

  it("writes an escaped receipt with paid/outstanding totals", () => {
    const write = vi.fn();
    const close = vi.fn();
    const popup = {
      opener: {} as unknown,
      document: { write, close },
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);

    printBills(order(), [bill()]);

    expect((popup as unknown as { opener: unknown }).opener).toBeNull();
    expect(close).toHaveBeenCalledOnce();
    const html = String(write.mock.calls[0]?.[0]);
    expect(html).toContain("Table &lt;VIP &amp; 1&gt;");
    expect(html).toContain("Paneer &lt;Tikka&gt;");
    expect(html).toContain("Main &quot;Bill&quot;");
    expect(html).toContain("PAYMENT DUE");
    expect(html).toContain("₹50.00");
    expect(html).not.toContain("₹999.00");
  });

  it("renders fallback labels, takeaway text and PAID state", () => {
    const write = vi.fn();
    const popup = {
      opener: null,
      document: { write, close: vi.fn() },
    } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);

    printBills(
      order({ table: null, type: "TAKEAWAY" }),
      [
        bill({
          splitLabel: null,
          discountAmount: 0,
          serviceChargeAmount: 0,
          totalAmount: 10,
          subtotal: 10,
          taxAmount: 0,
          payments: [{ status: "SUCCESS", amount: 10 }],
          itemAssignments: [],
        }),
      ],
    );

    const html = String(write.mock.calls[0]?.[0]);
    expect(html).toContain("TAKEAWAY");
    expect(html).toContain("Bill 1");
    expect(html).toContain("PAID");
    expect(html).not.toContain("Discount</dt>");
    expect(html).not.toContain("Service charge</dt>");
  });
});
