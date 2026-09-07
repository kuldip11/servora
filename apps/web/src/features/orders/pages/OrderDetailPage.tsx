import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Breadcrumbs, Button, Grid, Page, PageHeader, Spinner } from "@pos/ui";
import { formatTime } from "@/shared/utils/format";
import { useOrder } from "@/features/orders/hooks/useOrder";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";
import { useUpdateTicketStatus } from "@/features/orders/hooks/useUpdateTicketStatus";
import { useVoidOrderItem } from "@/features/orders/hooks/useVoidOrderItem";
import { useCompOrderItem } from "@/features/orders/hooks/useCompOrderItem";
import { usePermissions } from "@/shared/auth/permissions";
import { useCancellationReasons } from "@/features/orders/hooks/useCancellationReasons";
import { ReasonDialog } from "@/features/orders/components/ReasonDialog";
import {
  ManagerApprovalDialog,
  type ManagerApprovalRequest,
} from "@/features/orders/components/ManagerApprovalDialog";
import { extractApiError } from "@/shared/lib/api-client";
import { AddItemsModal } from "@/features/orders/components/AddItemsModal";
import { RefireItemDialog } from "@/features/orders/components/RefireItemDialog";
import { SeatShareDialog } from "@/features/orders/components/SeatShareDialog";
import { OrderExplainDialog } from "@/features/orders/components/OrderExplainDialog";
import { OrderFinancialSummary } from "@/features/orders/components/OrderFinancialSummary";
import { OrderSidebar } from "@/features/orders/components/OrderSidebar";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderStatusHistory } from "@/features/orders/components/OrderStatusHistory";
import { OrderTicketsSection } from "@/features/orders/components/OrderTicketsSection";
import { useOrdersRealtimeSync } from "@/features/orders/hooks/useOrdersRealtimeSync";
import { useAuthStore } from "@/store/auth";
import { getRoundActionPermissions } from "@/features/orders/utils/round-actions";

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  OPEN: [{ label: "Cancel Order", next: "CANCELLED" }],
  BILL_REQUESTED: [{ label: "Mark Paid", next: "PAID" }],
  PAID: [{ label: "Close Order", next: "CLOSED" }],
  CLOSED: [],
  CANCELLED: [],
};

type ReasonAction =
  { type: "cancel" } | { type: "void" | "comp"; itemId: string } | null;

type SeatShareTarget = {
  itemId: string;
  shares: Array<{ seatLabel: string; shareRatio: string | number }>;
};

export const OrderDetailPage = () => {
  useOrdersRealtimeSync();
  const { orderId } = useParams({ strict: false }) as { orderId: string };
  const [showAddItems, setShowAddItems] = useState(false);
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [pendingApproval, setPendingApproval] =
    useState<ManagerApprovalRequest | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [refireItemId, setRefireItemId] = useState<string | null>(null);
  const [seatShareTarget, setSeatShareTarget] =
    useState<SeatShareTarget | null>(null);

  const { data: order, isLoading } = useOrder(orderId);
  const updateStatusMutation = useUpdateOrderStatus(orderId);
  const updateTicketMutation = useUpdateTicketStatus(orderId);
  const voidItemMutation = useVoidOrderItem(orderId);
  const compItemMutation = useCompOrderItem(orderId);
  const { has } = usePermissions();
  const roles = useAuthStore(
    (state) => state.user?.roles.map((role) => role.name) ?? [],
  );
  const {
    canFire,
    canPrepare: canKitchen,
    canServe,
  } = getRoundActionPermissions(roles, has);
  const { data: cancellationReasons = [] } = useCancellationReasons();

  const submitLineAdjustment = (
    request: ManagerApprovalRequest,
    approvalToken?: string,
  ) => {
    const mutation =
      request.action === "void" ? voidItemMutation : compItemMutation;
    mutation.mutate(
      {
        itemId: request.itemId,
        ...request.reason,
        ...(approvalToken ? { approvalToken } : {}),
      },
      {
        onSuccess: () => {
          setReasonAction(null);
          setPendingApproval(null);
        },
        onError: (error) => {
          if (extractApiError(error).includes("Manager approval required")) {
            setReasonAction(null);
            setPendingApproval(request);
          }
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary">Order not found</p>
      </div>
    );
  }

  const tickets = order.kitchenTickets ?? [];
  const allTicketsServed =
    tickets.length > 0 && tickets.every((ticket) => ticket.status === "SERVED");
  const transitions = [...(STATUS_TRANSITIONS[order.status] ?? [])];
  if (order.status === "OPEN" && allTicketsServed) {
    transitions.unshift({ label: "Request Bill", next: "BILL_REQUESTED" });
  }
  const canAddItems = order.status === "OPEN";

  return (
    <Page>
      <PageHeader
        eyebrow={
          <Breadcrumbs
            items={[
              {
                label: "Orders",
                href: "/orders",
                as: Link,
                linkProps: { to: "/orders" },
              },
              { label: `Order #${order.id.slice(-8).toUpperCase()}` },
            ]}
          />
        }
        title={`Order #${order.id.slice(-8).toUpperCase()}`}
        description={formatTime(order.createdAt)}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExplanation(true)}
            >
              Explain
            </Button>
            <OrderStatusBadge status={order.status} />
          </div>
        }
      />

      {order.status === "OPEN" && !allTicketsServed && tickets.length > 0 && (
        <div className="bg-warning-surface border border-warning/20 rounded-lg px-4 py-2.5 text-sm text-warning">
          All rounds need to be served before the bill can be requested.
        </div>
      )}

      <Grid columns={{ base: 1, lg: 3 }} gap="lg">
        <div className="lg:col-span-2 space-y-4">
          <OrderTicketsSection
            order={order}
            canFire={canFire}
            canKitchen={canKitchen}
            canServe={canServe}
            hasPermission={has}
            updateTicketMutation={updateTicketMutation}
            voidItemMutation={voidItemMutation}
            compItemMutation={compItemMutation}
            onRefire={setRefireItemId}
            onSeatShare={setSeatShareTarget}
            onVoid={(itemId) => setReasonAction({ type: "void", itemId })}
            onComp={(itemId) => setReasonAction({ type: "comp", itemId })}
          />
          <OrderFinancialSummary order={order} />
          <OrderStatusHistory order={order} />
        </div>

        <OrderSidebar
          order={order}
          transitions={transitions}
          canAddItems={canAddItems}
          updateStatusMutation={updateStatusMutation}
          onAddItems={() => setShowAddItems(true)}
          onCancel={() => setReasonAction({ type: "cancel" })}
        />
      </Grid>

      {showAddItems && (
        <AddItemsModal
          orderId={orderId}
          onClose={() => setShowAddItems(false)}
        />
      )}
      {seatShareTarget && (
        <SeatShareDialog
          orderId={orderId}
          itemId={seatShareTarget.itemId}
          initialShares={seatShareTarget.shares}
          onClose={() => setSeatShareTarget(null)}
        />
      )}
      {refireItemId && (
        <RefireItemDialog
          orderId={orderId}
          itemId={refireItemId}
          onClose={() => setRefireItemId(null)}
        />
      )}
      <OrderExplainDialog
        open={showExplanation}
        orderId={orderId}
        onClose={() => setShowExplanation(false)}
      />
      <ManagerApprovalDialog
        open={pendingApproval !== null}
        orderId={orderId}
        request={pendingApproval}
        onClose={() => setPendingApproval(null)}
        onApproved={(approvalToken) =>
          pendingApproval &&
          submitLineAdjustment(pendingApproval, approvalToken)
        }
      />
      <ReasonDialog
        open={reasonAction !== null}
        title={
          reasonAction?.type === "cancel"
            ? "Cancel order"
            : reasonAction?.type === "comp"
              ? "Comp item"
              : "Void item"
        }
        reasons={cancellationReasons}
        loading={
          updateStatusMutation.isPending ||
          voidItemMutation.isPending ||
          compItemMutation.isPending
        }
        onClose={() => setReasonAction(null)}
        onSubmit={(reason) => {
          if (!reasonAction) return;
          if (reasonAction.type === "cancel") {
            updateStatusMutation.mutate(
              { status: "CANCELLED", ...reason },
              { onSuccess: () => setReasonAction(null) },
            );
            return;
          }
          submitLineAdjustment({
            action: reasonAction.type,
            itemId: reasonAction.itemId,
            reason,
          });
        }}
      />
    </Page>
  );
};
