import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  order: null as any,
  updateStatus: vi.fn(),
  updateTicket: vi.fn(),
  lineAdjust: vi.fn(),
  transfer: vi.fn(),
  invalidate: vi.fn(),
  api: {
    refire: vi.fn(() => Promise.resolve({})),
    refill: vi.fn(() => Promise.resolve({})),
    seat: vi.fn(() => Promise.resolve({})),
    split: vi.fn(() => Promise.resolve({})),
    splitItems: vi.fn(() => Promise.resolve({})),
    splitSeat: vi.fn((_: any, strategy: string) =>
      Promise.resolve(
        strategy === "MANUAL"
          ? {
              status: "MANUAL_REQUIRED",
              allocations: [{ orderItemIds: ["i1"] }, { orderItemIds: [] }],
              sharedItemIds: ["i2"],
            }
          : { status: "SPLIT" },
      ),
    ),
    merge: vi.fn(() => Promise.resolve({})),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useQuery: ({ queryKey }: any) => {
    const key = JSON.stringify(queryKey);
    if (key.includes("cancellation-reasons"))
      return { data: [{ id: "r1", label: "Mistake" }] };
    if (key.includes("merge-candidates"))
      return {
        data: [
          { id: "o1", status: "OPEN", type: "DINE_IN" },
          {
            id: "o2",
            status: "OPEN",
            type: "DINE_IN",
            table: { name: "Table 2" },
          },
          { id: "o3", status: "CLOSED", type: "DINE_IN" },
        ],
      };
    return { data: [] };
  },
  useMutation: (config: any) => ({
    isPending: false,
    mutate: (variables: any, options?: any) => {
      const result = config.mutationFn(variables);
      Promise.resolve(result).then((value) => {
        config.onSuccess?.(value);
        options?.onSuccess?.(value);
      });
    },
  }),
}));

vi.mock("@pos/ui", () => ({
  Spinner: () => <span>spinner</span>,
  IconButton: ({ onClick, "aria-label": label }: any) => (
    <button aria-label={label} onClick={onClick} />
  ),
  Button: ({ children, onClick, disabled }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  Input: ({ label, value, onChange, type = "text" }: any) => (
    <label>
      {label}
      <input aria-label={label} type={type} value={value} onChange={onChange} />
    </label>
  ),
  Modal: ({ open, title, children, onClose }: any) =>
    open ? (
      <section>
        <h2>{title}</h2>
        <button onClick={onClose}>modal-close</button>
        {children}
      </section>
    ) : null,
  SelectMenu: ({
    label,
    onChange,
    options = [],
    "aria-label": ariaLabel,
  }: any) => (
    <label>
      {label}
      <select
        aria-label={ariaLabel ?? label}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock("@/features/orders/hooks/useOrder", () => ({
  useOrder: () => ({ data: mocks.order, isLoading: false }),
}));
vi.mock("@/features/orders/hooks/useUpdateOrderStatus", () => ({
  useUpdateOrderStatus: () => ({
    isPending: false,
    mutate: mocks.updateStatus,
  }),
}));
vi.mock("@/features/orders/hooks/useUpdateTicketStatus", () => ({
  useUpdateTicketStatus: () => ({
    isPending: true,
    variables: { ticketId: "t1" },
    mutate: mocks.updateTicket,
  }),
}));
vi.mock("@/features/orders/hooks/useLineAdjustments", () => ({
  useLineAdjustments: () => ({ isPending: false, mutate: mocks.lineAdjust }),
}));
vi.mock("@/features/orders/hooks/useTransferTable", () => ({
  useTransferTable: () => ({ isPending: false, mutate: mocks.transfer }),
}));
vi.mock("@/features/menu/hooks/useTables", () => ({
  useTables: () => ({
    data: [
      { id: "table1", name: "Table 1", status: "OCCUPIED", capacity: 4 },
      { id: "table2", name: "Table 2", status: "AVAILABLE", capacity: 2 },
      { id: "table3", name: "Table 3", status: "RESERVED", capacity: 6 },
    ],
  }),
}));
vi.mock("@/features/auth/storage", () => ({ hasPermission: () => true }));
vi.mock("@pos/api-client", () => ({
  extractApiError: (e: any) => String(e?.message ?? e),
}));
vi.mock("@/features/orders/api/orders", () => ({
  fetchCancellationReasons: vi.fn(),
  fetchOrders: vi.fn(),
  refireOrderItem: (...a: any[]) => (mocks.api.refire as any)(...a),
  refillOrderItem: (...a: any[]) => (mocks.api.refill as any)(...a),
  setOrderItemSeatShares: (...a: any[]) => (mocks.api.seat as any)(...a),
  splitOrderBill: (...a: any[]) => (mocks.api.split as any)(...a),
  splitOrderBillByItems: (...a: any[]) => (mocks.api.splitItems as any)(...a),
  splitOrderBillBySeat: (...a: any[]) => (mocks.api.splitSeat as any)(...a),
  mergeOrders: (...a: any[]) => (mocks.api.merge as any)(...a),
}));

vi.mock("@/features/orders/components/OrderDetailHeader", () => ({
  OrderDetailHeader: ({ onBack }: any) => (
    <button onClick={onBack}>header-back</button>
  ),
}));
vi.mock("@/features/orders/components/OrderBanners", () => ({
  OrderBanners: ({ readyTickets }: any) => (
    <span>ready:{readyTickets.length}</span>
  ),
}));
vi.mock("@/features/orders/components/OrderTotals", () => ({
  OrderTotals: () => <span>totals</span>,
}));
vi.mock("@/features/orders/components/OrderTimeline", () => ({
  OrderTimeline: () => <span>timeline</span>,
}));
vi.mock("@/features/orders/components/TicketGroup", () => ({
  TicketGroup: (p: any) => (
    <div>
      <button onClick={() => p.onMarkServed?.(p.ticket.id)}>
        serve-ticket
      </button>
      <button onClick={() => p.onFireHeld?.(p.ticket.id)}>fire-ticket</button>
      <button onClick={() => p.onAdjust("i1", "void")}>void-item</button>
      <button onClick={() => p.onAdjust("i1", "comp")}>comp-item</button>
      <button onClick={() => p.onRefire?.("i1")}>refire-item</button>
      <button onClick={() => p.onRefill?.("i1")}>refill-item</button>
      <button onClick={() => p.onSeatShares?.("i1", [])}>seat-empty</button>
      <button
        onClick={() =>
          p.onSeatShares?.("i1", [{ seatLabel: "A", shareRatio: 1 }])
        }
      >
        seat-existing
      </button>
      <span>{String(p.isUpdating)}</span>
    </div>
  ),
}));
vi.mock("@/features/orders/components/OrderActions", () => ({
  OrderActions: (p: any) => (
    <div>
      <button onClick={p.onRequestBill}>request-bill</button>
      <button onClick={p.onAddItems}>add-items</button>
      <button onClick={p.onCancel}>cancel-order</button>
      <button onClick={p.onTransfer}>transfer-order</button>
      <button onClick={p.onSplit}>split-order</button>
      <button onClick={p.onMerge}>merge-order</button>
    </div>
  ),
}));
vi.mock("@/features/orders/components/ReasonDialog", () => ({
  ReasonDialog: ({ open, title, onSubmit, onClose }: any) =>
    open ? (
      <div>
        <span>{title}</span>
        <button
          onClick={() => onSubmit({ reasonCode: "OTHER", reasonText: "why" })}
        >
          submit-reason
        </button>
        <button onClick={onClose}>close-reason</button>
      </div>
    ) : null,
}));
vi.mock("@/features/orders/components/ManagerApprovalDialog", () => ({
  ManagerApprovalDialog: ({ open, onApproved, onClose }: any) =>
    open ? (
      <div>
        <button onClick={() => onApproved("token")}>approve-manager</button>
        <button onClick={onClose}>close-approval</button>
      </div>
    ) : null,
}));

import { OrderDetailPage } from "@/features/orders/pages/OrderDetailPage";

const openOrder = () => ({
  id: "o1",
  status: "OPEN",
  type: "DINE_IN",
  tableId: "table1",
  notes: "No salt",
  kitchenTickets: [
    { id: "t1", status: "READY" },
    { id: "t2", status: "SERVED" },
  ],
  items: [
    { id: "i1", quantity: 1, menuItemName: "Burger", itemStatus: "ACTIVE" },
    {
      id: "i2",
      quantity: 1,
      menuItemName: "Fries",
      itemStatus: "REFIRED",
      refiresOrderItemId: "i0",
      compedAt: null,
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.order = openOrder();
});

describe("OrderDetailPage interactions", () => {
  it("covers open-order ticket, adjustment, transfer, merge, refire and seat-share actions", async () => {
    const onAddItems = vi.fn();
    mocks.lineAdjust.mockImplementation((_v, options) =>
      options?.onSuccess?.(),
    );
    mocks.transfer.mockImplementation((_v, options) => options?.onSuccess?.());
    render(
      <OrderDetailPage orderId="o1" onBack={vi.fn()} onAddItems={onAddItems} />,
    );

    fireEvent.click(screen.getAllByText("serve-ticket")[0]!);
    fireEvent.click(screen.getAllByText("fire-ticket")[0]!);
    fireEvent.click(screen.getAllByText("refill-item")[0]!);
    expect(mocks.updateTicket).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText("add-items"));
    fireEvent.click(screen.getByText("request-bill"));
    expect(onAddItems).toHaveBeenCalledWith("o1");

    fireEvent.click(screen.getAllByText("void-item")[0]!);
    fireEvent.click(screen.getByText("submit-reason"));
    expect(mocks.lineAdjust).toHaveBeenCalled();

    fireEvent.click(screen.getByText("cancel-order"));
    fireEvent.click(screen.getByText("submit-reason"));
    expect(mocks.updateStatus).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("refire-item")[0]!);
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Burned" },
    });
    fireEvent.click(screen.getByText("Refire"));
    await waitFor(() => expect(mocks.api.refire).toHaveBeenCalled());

    fireEvent.click(screen.getAllByText("seat-empty")[0]!);
    fireEvent.click(screen.getByText("Save split"));
    await waitFor(() => expect(mocks.api.seat).toHaveBeenCalled());

    fireEvent.click(screen.getByText("transfer-order"));
    fireEvent.change(screen.getByLabelText("Destination"), {
      target: { value: "table2" },
    });
    fireEvent.change(screen.getByLabelText("Reason (optional)"), {
      target: { value: "Move" },
    });
    fireEvent.click(screen.getByText("Transfer"));
    expect(mocks.transfer).toHaveBeenCalled();

    fireEvent.click(screen.getByText("merge-order"));
    fireEvent.change(screen.getByLabelText("Merge billing into"), {
      target: { value: "o2" },
    });
    fireEvent.click(screen.getByText("Merge"));
    await waitFor(() => expect(mocks.api.merge).toHaveBeenCalled());
  });

  it("covers even, item and seat split modes", async () => {
    mocks.order = { ...openOrder(), status: "BILL_REQUESTED" };
    render(
      <OrderDetailPage orderId="o1" onBack={vi.fn()} onAddItems={vi.fn()} />,
    );
    fireEvent.click(screen.getByText("split-order"));
    fireEvent.click(screen.getByRole("button", { name: "Split bill" }));
    await waitFor(() => expect(mocks.api.split).toHaveBeenCalled());

    fireEvent.click(screen.getByText("split-order"));
    fireEvent.change(screen.getByLabelText("Split mode"), {
      target: { value: "ITEM" },
    });
    fireEvent.change(screen.getByLabelText("Number of bills"), {
      target: { value: "3" },
    });
    fireEvent.change(screen.getByLabelText("Bill for Burger"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split bill" }));
    await waitFor(() => expect(mocks.api.splitItems).toHaveBeenCalled());

    fireEvent.click(screen.getByText("split-order"));
    fireEvent.change(screen.getByLabelText("Split mode"), {
      target: { value: "SEAT" },
    });
    fireEvent.change(screen.getByLabelText("Shared items"), {
      target: { value: "MANUAL" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split bill" }));
    await waitFor(() => expect(mocks.api.splitSeat).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByLabelText("Bill for Burger")).toBeTruthy(),
    );
  });
});
