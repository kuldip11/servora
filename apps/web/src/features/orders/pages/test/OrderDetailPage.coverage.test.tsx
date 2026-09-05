import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  order: vi.fn(),
  updateStatus: { mutate: vi.fn(), isPending: false },
  updateTicket: { mutate: vi.fn(), isPending: false, variables: undefined as any },
  refire: { mutate: vi.fn(), isPending: false },
  seats: { mutate: vi.fn(), isPending: false },
  voidItem: { mutate: vi.fn(), isPending: false },
  compItem: { mutate: vi.fn(), isPending: false },
  reasons: vi.fn(() => ({ data: [{ id: "r1", label: "Mistake" }] })),
  has: vi.fn(() => true),
}));

vi.mock("@tanstack/react-router", () => ({ useParams: () => ({ orderId: "order-12345678" }), Link: ({ children }: React.PropsWithChildren) => <a>{children}</a> }));
vi.mock("@/features/orders/hooks/useOrder", () => ({ useOrder: mocks.order }));
vi.mock("@/features/orders/hooks/useUpdateOrderStatus", () => ({ useUpdateOrderStatus: () => mocks.updateStatus }));
vi.mock("@/features/orders/hooks/useUpdateTicketStatus", () => ({ useUpdateTicketStatus: () => mocks.updateTicket }));
vi.mock("@/features/orders/hooks/useRefireOrderItem", () => ({ useRefireOrderItem: () => mocks.refire }));
vi.mock("@/features/orders/hooks/useSetOrderItemSeatShares", () => ({ useSetOrderItemSeatShares: () => mocks.seats }));
vi.mock("@/features/orders/hooks/useVoidOrderItem", () => ({ useVoidOrderItem: () => mocks.voidItem }));
vi.mock("@/features/orders/hooks/useCompOrderItem", () => ({ useCompOrderItem: () => mocks.compItem }));
vi.mock("@/features/orders/hooks/useCancellationReasons", () => ({ useCancellationReasons: mocks.reasons }));
vi.mock("@/features/orders/hooks/useOrdersRealtimeSync", () => ({ useOrdersRealtimeSync: vi.fn() }));
vi.mock("@/shared/auth/permissions", () => ({ usePermissions: () => ({ has: mocks.has }) }));
vi.mock("@/store/auth", () => ({ useAuthStore: (selector: any) => selector({ user: { roles: [{ name: "OWNER" }] } }) }));
vi.mock("@/features/orders/utils/round-actions", () => ({ getRoundActionPermissions: () => ({ canFire: true, canPrepare: true, canServe: true }) }));
vi.mock("@/shared/lib/api-client", () => ({ extractApiError: (e: unknown) => String(e) }));
vi.mock("@/features/orders/components/AddItemsModal", () => ({ AddItemsModal: ({ onClose }: { onClose: () => void }) => <div data-testid="add-items"><button onClick={onClose}>close add</button></div> }));
vi.mock("@/features/orders/components/OrderExplainDialog", () => ({ OrderExplainDialog: ({ onClose }: { onClose: () => void }) => <div data-testid="explain"><button onClick={onClose}>close explain</button></div> }));
vi.mock("@/features/orders/components/ReasonDialog", () => ({ ReasonDialog: ({ onSubmit, onClose }: any) => <div data-testid="reason"><button onClick={() => onSubmit({ reason: "Mistake", cancellationReasonId: "r1" })}>submit reason</button><button onClick={onClose}>close reason</button></div> }));
vi.mock("@/features/orders/components/ManagerApprovalDialog", () => ({ ManagerApprovalDialog: ({ onApproved, onClose }: any) => <div data-testid="approval"><button onClick={() => onApproved("token")}>approve</button><button onClick={onClose}>close approval</button></div> }));
vi.mock("@pos/ui", () => ({
  Button: ({ children, onClick, disabled }: any) => <button disabled={disabled} onClick={onClick}>{children}</button>,
  Badge: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
  Card: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
  Spinner: () => <div>spinner</div>,
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description, actions, eyebrow }: any) => <header>{eyebrow}<h1>{title}</h1><p>{description}</p>{actions}</header>,
  Breadcrumbs: () => <nav>breadcrumbs</nav>,
  Grid: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  Modal: ({ open, title, children }: any) => open ? <div><h2>{title}</h2>{children}</div> : null,
  Input: ({ label, value, onChange, ...props }: any) => <label>{label}<input aria-label={label} value={value} onChange={onChange} {...props}/></label>,
}));

import { OrderDetailPage } from "../OrderDetailPage";

const item = (id: string, status = "ACTIVE", extra: Record<string, unknown> = {}) => ({ id, menuItemId: `m-${id}`, menuItemName: `Item ${id}`, quantity: 1, subtotal: "50", itemStatus: status, modifiers: [{ modifierId: `mod-${id}`, name: "Cheese", quantity: 2 }], ...extra });
const ticket = (id: string, status: string, items: any[]) => ({ id, ticketNumber: 1, status, notes: `note-${id}`, items });
const fullOrder = (status = "OPEN") => ({
  id: "order-12345678", status, type: "DINE_IN", createdAt: "2026-09-04T12:00:00Z", table: { name: "T1" }, notes: "No onion",
  subtotal: "100", taxAmount: "10", totalAmount: "115", discountAmount: "2", serviceChargeAmount: "5", roundingAdjustment: "0.01",
  items: [item("active"), item("void", "VOIDED", { voidedReason: "Mistake" }), item("refire", "REFIRED", { refireReason: "Cold", compedAt: "x" }), item("replacement", "ACTIVE", { refiresOrderItemId: "refire" }), item("comp", "COMPED", { compedReason: "Service" })],
  kitchenTickets: [ticket("held", "HELD", [item("active")]), ticket("fired", "FIRED", [item("fired", "ACTIVE", { variantName: "Large", chefNotes: "hot", station: { name: "Grill" } })]), ticket("prep", "PREPARING", [item("prep")]), ticket("ready", "READY", [item("ready")])],
  statusHistory: [{ id: "h1", changedAt: "2026-09-04T12:05:00Z", newStatus: "OPEN", reason: "Created", cancellationReason: { label: "None" } }],
});

describe("OrderDetailPage coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.mockReturnValue({ data: fullOrder(), isLoading: false });
    mocks.has.mockReturnValue(true);
  });

  it("renders loading and missing states", () => {
    mocks.order.mockReturnValueOnce({ data: undefined, isLoading: true });
    const { rerender } = render(<OrderDetailPage />);
    expect(screen.getByText("spinner")).toBeTruthy();
    mocks.order.mockReturnValueOnce({ data: undefined, isLoading: false });
    rerender(<OrderDetailPage />);
    expect(screen.getByText("Order not found")).toBeTruthy();
  });

  it("renders rich order state and drives ticket, item, explanation and add-item actions", () => {
    render(<OrderDetailPage />);
    expect(screen.getByText("All rounds need to be served before the bill can be requested.")).toBeTruthy();
    fireEvent.click(screen.getByText("Fire Course Now"));
    fireEvent.click(screen.getByText("Start Preparing"));
    fireEvent.click(screen.getByText("Mark Ready"));
    fireEvent.click(screen.getByText("Mark Served"));
    expect(mocks.updateTicket.mutate).toHaveBeenCalledTimes(4);

    fireEvent.click(screen.getByText("Explain"));
    expect(screen.getByTestId("explain")).toBeTruthy();
    fireEvent.click(screen.getByText("close explain"));
    fireEvent.click(screen.getByText("Add More Items"));
    expect(screen.getByTestId("add-items")).toBeTruthy();
    fireEvent.click(screen.getByText("close add"));

    fireEvent.click(screen.getAllByText("Refire")[0]!);
    expect(screen.getByText("Refire item")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Cold" } });
    fireEvent.click(screen.getAllByText("Refire").at(-1)!);
    expect(mocks.refire.mutate).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("Split across seats")[0]!);
    expect(screen.getByText("Total 1.00")).toBeTruthy();
    fireEvent.click(screen.getByText("Save split"));
    expect(mocks.seats.mutate).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("Void")[0]!);
    fireEvent.click(screen.getByText("submit reason"));
    expect(mocks.voidItem.mutate).toHaveBeenCalled();
  });

  it("exposes bill and close transitions for terminal ticket/order states", () => {
    mocks.order.mockReturnValue({ data: { ...fullOrder("OPEN"), kitchenTickets: [ticket("served", "SERVED", [item("x")])] }, isLoading: false });
    const { unmount } = render(<OrderDetailPage />);
    fireEvent.click(screen.getByText("Request Bill"));
    expect(mocks.updateStatus.mutate).toHaveBeenCalledWith({ status: "BILL_REQUESTED" });
    unmount();
    mocks.order.mockReturnValue({ data: fullOrder("BILL_REQUESTED"), isLoading: false });
    render(<OrderDetailPage />);
    fireEvent.click(screen.getByText("Mark Paid"));
    expect(mocks.updateStatus.mutate).toHaveBeenCalledWith({ status: "PAID" });
  });
});
