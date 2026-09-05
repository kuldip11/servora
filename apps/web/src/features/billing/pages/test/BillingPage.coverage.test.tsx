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
  useQuery: () => ({ data: [] }),
  useMutation: (options: any) => ({ mutate: (vars: any) => { const result = options.mutationFn(vars); options.onSuccess?.(result ?? { status: "DONE" }); }, isPending: false }),
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
  Select: ({ label, value, onChange, children }: any) => <label>{label}<select aria-label={label} value={value} onChange={onChange}>{children}</select></label>,
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

  it("renders empty state without billing-create permission", () => {
    mocks.has.mockReturnValue(false);
    mocks.orders.mockReturnValue({ data: { items: [], pagination: { total: 0 } }, isLoading: false });
    render(<BillingPage />);
    expect(screen.getByText("No pending payments")).toBeTruthy();
  });
});
