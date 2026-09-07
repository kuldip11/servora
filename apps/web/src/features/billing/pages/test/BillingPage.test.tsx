import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  orders: vi.fn(),
  payMutate: vi.fn(),
  has: vi.fn(() => true),
  printBills: vi.fn(),
  splitOrder: vi.fn(),
  splitItems: vi.fn(),
  splitSeat: vi.fn(),
  queryData: [] as unknown[],
}));

vi.mock("@/features/orders/hooks/useOrders", () => ({ useOrdersPage: mocks.orders }));
vi.mock("@/features/billing/hooks/useCollectPayment", () => ({ useCollectPayment: () => ({ mutate: mocks.payMutate, isPending: false }) }));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/features/billing/utils/print-bills", () => ({ printBills: mocks.printBills }));
vi.mock("@/features/billing/services/billing.service", () => ({ billingService: {
  getOrderBills: vi.fn(async () => []), splitOrder: mocks.splitOrder, splitOrderByItems: mocks.splitItems, splitOrderBySeat: mocks.splitSeat,
} }));
vi.mock("@/shared/lib/query-client", () => ({ queryClient: { invalidateQueries: vi.fn() } }));
vi.mock("@/shared/lib/notify", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.queryData }),
  useMutation: (options: any) => ({
    mutate: (vars: any) => {
      try {
        const result = options.mutationFn(vars);
        options.onSuccess?.(result ?? { status: "DONE" });
      } catch (error) {
        options.onError?.(error);
      }
    },
    isPending: false,
  }),
}));
vi.mock("@pos/validation", () => ({ createPaymentSchema: { safeParse: (value: any) => value.amount > 0 ? { success: true, data: value } : { success: false, error: { issues: [{ message: "Invalid amount" }] } } } }));
vi.mock("@pos/ui", () => ({
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Button: ({ children, onClick, disabled }: any) => <button disabled={disabled} onClick={onClick}>{children}</button>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Input: ({ label, value, onChange, ...props }: any) => <label>{label}<input aria-label={label} value={value} onChange={onChange} {...props}/></label>,
  Modal: ({ open, title, children }: any) => open ? <div role="dialog"><h2>{title}</h2>{children}</div> : null,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description }: any) => <header><h1>{title}</h1><p>{description}</p></header>,
  Pagination: ({ onPageChange, onPageSizeChange }: any) => <div><button onClick={() => onPageChange(2)}>page2</button><button onClick={() => onPageSizeChange(50)}>size50</button></div>,
  Select: ({ label, value, onChange, children, options = [] }: any) => (
    <label>{label}<select aria-label={label} value={value} onChange={onChange}>
      {children ?? options.map((option: any) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select></label>
  ),
  StatusBadge: ({ label }: any) => <span>{label}</span>,
  Table: ({ columns, data, emptyTitle }: any) => <div>{data.length ? data.map((row: any) => <div key={row.id}>{columns.map((c: any) => <div key={c.id}>{c.cell?.(row)}</div>)}</div>) : <span>{emptyTitle}</span>}</div>,
}));

import { BillingPage } from "../BillingPage";

const order = {
  id: "order-12345678", status: "BILL_REQUESTED", type: "DINE_IN", createdAt: "2026-09-04T12:00:00Z",
  table: { name: "4" }, subtotal: "100", taxAmount: "10", discountAmount: "0", serviceChargeAmount: "5", totalAmount: "115",
  payments: [{ id: "p1", status: "SUCCESS", amount: "15" }],
  items: [
    { id: "i1", menuItemId: "m1", menuItemName: "Burger", quantity: 1, itemStatus: "ACTIVE", comboGroupId: null },
    { id: "i2", menuItemId: "m2", menuItemName: "Fries", quantity: 1, itemStatus: "ACTIVE", comboGroupId: "c1" },
    { id: "i3", menuItemId: null, menuItemName: "Combo", quantity: 1, itemStatus: "ACTIVE", comboGroupId: "c1" },
  ],
};

describe("BillingPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.has.mockReturnValue(true);
    mocks.queryData = [];
    mocks.splitOrder.mockReturnValue({ status: "DONE" });
    mocks.splitItems.mockReturnValue({ status: "DONE" });
    mocks.splitSeat.mockReturnValue({ status: "DONE" });
    mocks.orders.mockReturnValue({ data: { items: [order], pagination: { total: 1 } }, isLoading: false });
  });

  it("renders billable order and exercises payment and pagination", () => {
    render(<BillingPage />);
    expect(screen.getByText("Billing")).toBeTruthy();
    fireEvent.click(screen.getByText("Collect Payment"));
    expect(screen.getByText("Order #12345678")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByText("Confirm Payment"));
    expect(mocks.payMutate).toHaveBeenCalled();
    fireEvent.click(screen.getByText("page2"));
    fireEvent.click(screen.getByText("size50"));
  });

  it("exercises print preview and even split", () => {
    render(<BillingPage />);
    fireEvent.click(screen.getByText("Print Bill"));
    expect(screen.getByText("Preview and print bills")).toBeTruthy();
    fireEvent.click(screen.getByText("Select all"));
    fireEvent.click(screen.getByText("Print selected"));
    expect(mocks.printBills).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Split"));
    expect(screen.getAllByText("Split bill").length).toBeGreaterThan(1);
    fireEvent.click(screen.getAllByText("Split bill").at(-1)!);
    expect(mocks.splitOrder).toHaveBeenCalled();
  });


  it("covers bill selection, item summaries, validation, and non-cash references", () => {
    mocks.queryData = [
      {
        id: "b1", orderId: order.id, splitLabel: "Main", subtotal: 80, taxAmount: 8, discountAmount: 5,
        serviceChargeAmount: 4, roundingAdjustment: 0.5, totalAmount: 87.5, createdAt: order.createdAt,
        payments: [{ id: "bp1", status: "SUCCESS", amount: "7.5" }],
        itemAssignments: [
          { orderItemId: "i1", orderItem: { id: "i1", menuItemId: "m1", menuItemName: "Burger", quantity: 1, taxMode: "INCLUSIVE", order: { id: order.id, table: { name: "4" } } } },
          { orderItemId: "i3", orderItem: { id: "i3", menuItemId: null, menuItemName: "Combo", quantity: 1, comboGroupId: "c1", taxMode: "EXCLUSIVE", order: { id: order.id, table: { name: "4" } } } },
          { orderItemId: "i2", orderItem: { id: "i2", menuItemId: "m2", menuItemName: "Fries", quantity: 2, comboGroupId: "c1", order: { id: order.id, table: { name: "4" } } } },
        ],
      },
      { id: "b2", orderId: order.id, splitLabel: null, subtotal: 20, taxAmount: 2, discountAmount: 0, serviceChargeAmount: 0, roundingAdjustment: 0, totalAmount: 20, createdAt: order.createdAt, payments: [] },
    ];
    render(<BillingPage />);
    fireEvent.click(screen.getByText("Collect Payment"));
    fireEvent.change(screen.getByLabelText("Bill"), { target: { value: "b1" } });
    expect(screen.getByText("Tax (mixed included/exclusive)")).toBeTruthy();
    expect(screen.getByText("Discount")).toBeTruthy();
    expect(screen.getByText("Service charge")).toBeTruthy();
    expect(screen.getByText("Rounding")).toBeTruthy();
    expect(screen.getByText(/Combo/)).toBeTruthy();
    expect(screen.getByText("2× Fries")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Payment Method"), { target: { value: "CARD" } });
    fireEvent.change(screen.getByLabelText("Reference / Transaction ID"), { target: { value: "txn-1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Confirm Payment"));
    expect(screen.getByText("Invalid amount")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "80" } });
    fireEvent.click(screen.getByText("Confirm Payment"));
    expect(mocks.payMutate).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: order.id, input: expect.objectContaining({ billId: "b1", method: "CARD", amount: 80, reference: "txn-1" }) }),
      expect.any(Object),
    );
  });

  it("covers printing persisted bills and checkbox selection", () => {
    mocks.queryData = [
      { id: "paid", orderId: order.id, splitLabel: "Paid bill", totalAmount: 10, payments: [{ status: "SUCCESS", amount: "10" }] },
      { id: "due", orderId: order.id, splitLabel: null, totalAmount: 20, payments: [] },
    ];
    render(<BillingPage />);
    fireEvent.click(screen.getByText("Print Bill"));
    expect(screen.getByText("Paid")).toBeTruthy();
    expect(screen.getByText(/due/)).toBeTruthy();
    const dueCheckbox = screen.getByLabelText("Select Bill 2");
    fireEvent.click(dueCheckbox);
    fireEvent.click(screen.getByText("Print selected"));
    expect(mocks.printBills).toHaveBeenCalledWith(order, [expect.objectContaining({ id: "due" })]);
    fireEvent.click(dueCheckbox);
    expect((screen.getByText("Print selected") as HTMLButtonElement).disabled).toBe(true);
  });

  it("covers item split allocation and combo-group remapping", () => {
    const splitOrderData = {
      ...order,
      items: [
        ...order.items,
        { id: "i4", menuItemId: "m4", menuItemName: "Refired", quantity: 1, itemStatus: "REFIRED", compedAt: null, comboGroupId: null },
        { id: "i5", menuItemId: "m5", menuItemName: "Comped", quantity: 1, itemStatus: "REFIRED", compedAt: "2026-01-01", comboGroupId: null },
      ],
    };
    mocks.orders.mockReturnValue({ data: { items: [splitOrderData], pagination: { total: 1 } }, isLoading: false });
    render(<BillingPage />);
    fireEvent.click(screen.getByText("Split"));
    fireEvent.change(screen.getByLabelText("Split mode"), { target: { value: "ITEM" } });
    fireEvent.change(screen.getByLabelText("Number of bills"), { target: { value: "3" } });
    const itemSelects = screen.getAllByRole("combobox").filter((element) => !(element as HTMLSelectElement).getAttribute("aria-label"));
    expect(itemSelects.length).toBeGreaterThan(2);
    fireEvent.change(itemSelects[1]!, { target: { value: "2" } });
    fireEvent.click(screen.getAllByText("Split bill").at(-1)!);
    expect(mocks.splitItems).toHaveBeenCalledWith(
      splitOrderData.id,
      expect.arrayContaining([expect.objectContaining({ label: "Bill 3", orderItemIds: expect.arrayContaining(["i2", "i3"]) })]),
    );
  });

  it("covers seat split success and manual-required conversion", () => {
    const { unmount } = render(<BillingPage />);
    fireEvent.click(screen.getByText("Split"));
    fireEvent.change(screen.getByLabelText("Split mode"), { target: { value: "SEAT" } });
    fireEvent.change(screen.getByLabelText("Shared items"), { target: { value: "MANUAL" } });
    fireEvent.click(screen.getAllByText("Split bill").at(-1)!);
    expect(mocks.splitSeat).toHaveBeenCalledWith(order.id, "MANUAL");
    unmount();

    mocks.splitSeat.mockReturnValue({
      status: "MANUAL_REQUIRED",
      allocations: [
        { orderItemIds: ["i1"] },
        { orderItemIds: ["i2"] },
      ],
      sharedItemIds: ["i3"],
    });
    render(<BillingPage />);
    fireEvent.click(screen.getByText("Split"));
    fireEvent.change(screen.getByLabelText("Split mode"), { target: { value: "SEAT" } });
    fireEvent.click(screen.getAllByText("Split bill").at(-1)!);
    expect(screen.getByLabelText("Number of bills")).toBeTruthy();
    expect(screen.getByText(/Combo/)).toBeTruthy();
  });

  it("covers non-table fulfilment and loading/undefined result fallbacks", () => {
    mocks.orders.mockReturnValue({ data: undefined, isLoading: true });
    const first = render(<BillingPage />);
    expect(screen.getByText("No pending payments")).toBeTruthy();
    first.unmount();

    mocks.orders.mockReturnValue({
      data: { items: [{ ...order, table: null, type: "TAKE_AWAY", payments: undefined, items: undefined, discountAmount: undefined, serviceChargeAmount: undefined }], pagination: { total: 1 } },
      isLoading: false,
    });
    render(<BillingPage />);
    expect(screen.getByText("TAKE AWAY")).toBeTruthy();
    fireEvent.click(screen.getByText("Collect Payment"));
    fireEvent.click(screen.getByText("Cancel"));
  });

  it("renders empty state without billing-create permission", () => {
    mocks.has.mockReturnValue(false);
    mocks.orders.mockReturnValue({ data: { items: [], pagination: { total: 0 } }, isLoading: false });
    render(<BillingPage />);
    expect(screen.getByText("No pending payments")).toBeTruthy();
  });
});
