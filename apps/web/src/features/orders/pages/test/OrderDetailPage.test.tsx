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

vi.mock("@tanstack/react-router", () => ({ useParams: () => ({ orderId: "order-12345678" }), Link: ({ children }: React.PropsWithChildren) => <a href="/">{children}</a> }));
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


  it("covers cancel, comp approval, and paid-to-closed transitions", () => {
    mocks.compItem.mutate.mockImplementationOnce((_vars: unknown, options: { onError?: (error: Error) => void }) => {
      options.onError?.(new Error("Manager approval required"));
    });
    render(<OrderDetailPage />);
    fireEvent.click(screen.getAllByText("Comp")[0]!);
    fireEvent.click(screen.getByText("submit reason"));
    expect(screen.getByTestId("approval")).toBeTruthy();
    fireEvent.click(screen.getByText("approve"));
    expect(mocks.compItem.mutate).toHaveBeenLastCalledWith(
      expect.objectContaining({ itemId: "active", approvalToken: "token" }),
      expect.any(Object),
    );
    fireEvent.click(screen.getByText("Cancel Order"));
    fireEvent.click(screen.getByText("submit reason"));
    expect(mocks.updateStatus.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "CANCELLED", reason: "Mistake" }),
      expect.any(Object),
    );
  });

  it("covers seat-share editing, add/remove validation, and refire billing toggle", () => {
    const orderWithShares = fullOrder();
    orderWithShares.kitchenTickets = [ticket("held", "HELD", [
      item("active", "ACTIVE", { seatShares: [
        { seatLabel: "A", shareRatio: 0.4 },
        { seatLabel: "B", shareRatio: 0.3 },
        { seatLabel: "C", shareRatio: 0.3 },
      ] }),
    ])];
    mocks.order.mockReturnValue({ data: orderWithShares, isLoading: false });
    render(<OrderDetailPage />);
    fireEvent.click(screen.getByText("Split across seats"));
    const seat1 = screen.getByLabelText("Seat 1");
    fireEvent.change(seat1, { target: { value: "  VIP  " } });
    fireEvent.click(screen.getByText("+ Seat"));
    const ratios = screen.getAllByLabelText("Share ratio");
    fireEvent.change(ratios[3]!, { target: { value: "0" } });
    expect((screen.getByText("Save split") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByText("Remove")[3]!);
    fireEvent.click(screen.getByText("Save split"));
    expect(mocks.seats.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ shares: expect.arrayContaining([expect.objectContaining({ seatLabel: "VIP", shareRatio: 0.4 })]) }),
      expect.any(Object),
    );

    fireEvent.click(screen.getAllByText("Refire")[0]!);
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "  remake  " } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getAllByText("Refire").at(-1)!);
    expect(mocks.refire.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: "active", reason: "remake", alsoCompOriginal: false }),
      expect.any(Object),
    );
  });

  it("covers course headings, unknown statuses, no-ticket orders, and optional pricing fields", () => {
    mocks.order.mockReturnValue({
      data: {
        ...fullOrder("PAID"),
        status: "PAID",
        table: null,
        notes: null,
        serviceChargeAmount: "0",
        roundingAdjustment: "0",
        discountAmount: "0",
        items: [item("tax-in", "ACTIVE", { taxMode: "INCLUSIVE" }), item("tax-ex", "ACTIVE", { taxMode: "EXCLUSIVE", modifiers: [{ modifierId: "m", name: "Sauce", quantity: 1 }] })],
        kitchenTickets: [{ ...ticket("course", "SERVED", []), course: { courseNumber: 2, name: "Mains" }, notes: null }],
        statusHistory: [{ id: "h2", changedAt: "2026-09-04T12:05:00Z", newStatus: "PAID", reason: null, cancellationReason: null }],
      },
      isLoading: false,
    });
    const first = render(<OrderDetailPage />);
    expect(screen.getByText("Course 2 · Mains")).toBeTruthy();
    expect(screen.getByText("Tax (mixed included/exclusive)")).toBeTruthy();
    fireEvent.click(screen.getByText("Close Order"));
    expect(mocks.updateStatus.mutate).toHaveBeenCalledWith({ status: "CLOSED" });
    first.unmount();

    mocks.order.mockReturnValue({ data: { ...fullOrder("UNKNOWN"), status: "UNKNOWN", kitchenTickets: [], items: [], statusHistory: [] }, isLoading: false });
    render(<OrderDetailPage />);
    expect(screen.getAllByText(/Unknown/i).length).toBeGreaterThan(0);
  });

  it("covers mutation success callbacks and modal close handlers", () => {
    mocks.compItem.mutate.mockImplementationOnce((_vars: unknown, options: { onSuccess?: () => void }) => options.onSuccess?.());
    mocks.seats.mutate.mockImplementationOnce((_vars: unknown, options: { onSuccess?: () => void }) => options.onSuccess?.());
    mocks.refire.mutate.mockImplementationOnce((_vars: unknown, options: { onSuccess?: () => void }) => options.onSuccess?.());
    mocks.updateStatus.mutate.mockImplementationOnce((_vars: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
    render(<OrderDetailPage />);

    fireEvent.click(screen.getAllByText("Comp")[0]!);
    fireEvent.click(screen.getByText("submit reason"));
    expect(mocks.compItem.mutate).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("Split across seats")[0]!);
    const firstRatio=screen.getAllByLabelText("Share ratio")[0]!;
    fireEvent.change(firstRatio,{target:{value:"0.5"}});
    fireEvent.change(firstRatio,{target:{value:"0.5"}});
    fireEvent.click(screen.getByText("Cancel"));

    fireEvent.click(screen.getAllByText("Split across seats")[0]!);
    fireEvent.click(screen.getByText("Save split"));
    expect(mocks.seats.mutate).toHaveBeenCalled();

    fireEvent.click(screen.getAllByText("Refire")[0]!);
    fireEvent.change(screen.getByLabelText("Reason"),{target:{value:"retry"}});
    fireEvent.click(screen.getAllByText("Refire").at(-1)!);
    expect(mocks.refire.mutate).toHaveBeenCalled();

    fireEvent.click(screen.getByText("Cancel Order"));
    fireEvent.click(screen.getByText("submit reason"));
    expect(mocks.updateStatus.mutate).toHaveBeenCalled();
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
