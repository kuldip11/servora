import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spinner, IconButton } from "@pos/ui";
import { X } from "lucide-react";
import { useOrder } from "@/features/orders/hooks/useOrder";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";
import { useUpdateTicketStatus } from "@/features/orders/hooks/useUpdateTicketStatus";
import { OrderDetailHeader } from "@/features/orders/components/OrderDetailHeader";
import { OrderBanners } from "@/features/orders/components/OrderBanners";
import { TicketGroup } from "@/features/orders/components/TicketGroup";
import { OrderTotals } from "@/features/orders/components/OrderTotals";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { OrderActions } from "@/features/orders/components/OrderActions";
import { MergeOrderDialog } from "@/features/orders/components/MergeOrderDialog";
import { SplitBillDialog } from "@/features/orders/components/SplitBillDialog";
import { TransferTableDialog } from "@/features/orders/components/TransferTableDialog";
import { SeatShareDialog } from "@/features/orders/components/SeatShareDialog";
import { RefireItemDialog } from "@/features/orders/components/RefireItemDialog";
import { useLineAdjustments } from "@/features/orders/hooks/useLineAdjustments";
import { hasPermission } from "@/features/auth/storage";
import {
  fetchCancellationReasons,
  refillOrderItem,
} from "@/features/orders/api/orders";
import { ReasonDialog } from "@/features/orders/components/ReasonDialog";
import {
  ManagerApprovalDialog,
  type ManagerApprovalRequest,
} from "@/features/orders/components/ManagerApprovalDialog";
import { extractApiError } from "@pos/api-client";

interface Props {
  orderId: string;
  onBack: () => void;
  onAddItems: (orderId: string) => void;
}

export const OrderDetailPage = ({ orderId, onBack, onAddItems }: Props) => {
  const qc = useQueryClient();
  const { data: order, isLoading } = useOrder(orderId);
  const updateStatus = useUpdateOrderStatus();
  const updateTicketStatus = useUpdateTicketStatus();
  const lineAdjustments = useLineAdjustments(orderId);
  const refill = useMutation({
    mutationFn: (itemId: string) => refillOrderItem(orderId, itemId),
    onSuccess: () => qc.invalidateQueries(),
  });
  const [seatShareDialog, setSeatShareDialog] = useState<{
    itemId: string;
    shares: Array<{ seatLabel: string; shareRatio: number }>;
  } | null>(null);
  const [refireItemId, setRefireItemId] = useState<string | null>(null);
  const [reasonAction, setReasonAction] = useState<
    { type: "cancel" } | { type: "void" | "comp"; itemId: string } | null
  >(null);
  const [pendingApproval, setPendingApproval] =
    useState<ManagerApprovalRequest | null>(null);
  const { data: cancellationReasons = [] } = useQuery({
    queryKey: ["cancellation-reasons", "active"],
    queryFn: fetchCancellationReasons,
  });
  const [showTransfer, setShowTransfer] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const submitLineAdjustment = (
    request: ManagerApprovalRequest,
    approvalToken?: string,
  ) => {
    lineAdjustments.mutate(
      {
        itemId: request.itemId,
        action: request.action,
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

  const isTicketUpdating = useCallback(
    (ticketId: string) =>
      updateTicketStatus.isPending &&
      updateTicketStatus.variables?.ticketId === ticketId,
    [updateTicketStatus.isPending, updateTicketStatus.variables],
  );

  const handleMarkServed = useCallback(
    (ticketId: string) =>
      updateTicketStatus.mutate({ ticketId, status: "SERVED" }),
    [updateTicketStatus],
  );

  if (isLoading)
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3">
          {}
          <IconButton
            icon={X}
            aria-label="Back to Orders"
            size="lg"
            className="w-9 h-9 rounded-xl bg-surface-secondary hover:bg-surface-secondary"
            onClick={onBack}
          />
          <h2 className="font-bold text-text-primary">Order Detail</h2>
        </div>
        <div className="flex justify-center py-12">
          <Spinner className="w-6 h-6" />
        </div>
      </div>
    );

  if (!order) return null;

  const tickets = order.kitchenTickets ?? [];
  const replacementByOriginalId = new Map<string, { id: string }>(
    (order.items ?? []).flatMap((item) =>
      item.refiresOrderItemId
        ? [[item.refiresOrderItemId, { id: item.id }] as const]
        : [],
    ),
  );
  const readyTickets = tickets.filter((t) => t.status === "READY");
  const allTicketsServed =
    tickets.length > 0 && tickets.every((t) => t.status === "SERVED");

  const canRequestBill = order.status === "OPEN" && allTicketsServed;
  const canAddItems = order.status === "OPEN";
  const canCancel = order.status === "OPEN";

  return (
    <div className="flex flex-col h-screen bg-background">
      <OrderDetailHeader order={order} onBack={onBack} />

      <div className="flex-1 overflow-y-auto">
        <OrderBanners order={order} readyTickets={readyTickets} />

        {tickets.map((ticket) => (
          <TicketGroup
            key={ticket.id}
            ticket={ticket}
            onMarkServed={
              hasPermission("orders:update_status")
                ? handleMarkServed
                : undefined
            }
            isUpdating={isTicketUpdating(ticket.id)}
            canVoid={order.status === "OPEN" && hasPermission("orders:void")}
            canComp={order.status === "OPEN" && hasPermission("orders:comp")}
            onAdjust={(itemId, action) =>
              setReasonAction({ type: action, itemId })
            }
            onFireHeld={
              order.status === "OPEN" && hasPermission("orders:update")
                ? (ticketId) =>
                    updateTicketStatus.mutate({ ticketId, status: "FIRED" })
                : undefined
            }
            onRefire={
              order.status === "OPEN" && hasPermission("orders:update")
                ? (itemId) => setRefireItemId(itemId)
                : undefined
            }
            onRefill={
              order.status === "OPEN" && hasPermission("orders:update")
                ? (itemId) => refill.mutate(itemId)
                : undefined
            }
            onSeatShares={
              order.status === "OPEN" && hasPermission("billing:create")
                ? (itemId, current) =>
                    setSeatShareDialog({
                      itemId,
                      shares: current.map((share) => ({
                        seatLabel: share.seatLabel,
                        shareRatio: Number(share.shareRatio),
                      })),
                    })
                : undefined
            }
            replacementByOriginalId={replacementByOriginalId}
          />
        ))}

        {order.notes && (
          <div className="mx-4 mt-3 bg-warning-surface border border-warning/20 rounded-2xl px-4 py-3">
            <p className="text-xs font-semibold text-warning mb-1">
              Order Notes
            </p>
            <p className="text-sm text-warning">{order.notes}</p>
          </div>
        )}

        <OrderTotals order={order} />
        <OrderTimeline order={order} />
      </div>

      <OrderActions
        order={order}
        canRequestBill={canRequestBill}
        canAddItems={canAddItems}
        canCancel={canCancel}
        allTicketsServed={allTicketsServed}
        isUpdatingStatus={updateStatus.isPending}
        onRequestBill={() =>
          updateStatus.mutate({ id: orderId, status: "BILL_REQUESTED" })
        }
        onAddItems={() => onAddItems(orderId)}
        onCancel={() => setReasonAction({ type: "cancel" })}
        onTransfer={
          order.status === "OPEN" &&
          order.type === "DINE_IN" &&
          !!order.tableId &&
          hasPermission("orders:update")
            ? () => setShowTransfer(true)
            : undefined
        }
        onSplit={
          order.status === "BILL_REQUESTED" && hasPermission("billing:create")
            ? () => setShowSplit(true)
            : undefined
        }
        onMerge={
          order.status === "OPEN" &&
          order.type === "DINE_IN" &&
          hasPermission("orders:update")
            ? () => setShowMerge(true)
            : undefined
        }
      />
      <SplitBillDialog
        open={showSplit}
        orderId={orderId}
        items={order.items ?? []}
        onClose={() => setShowSplit(false)}
      />
      <MergeOrderDialog
        open={showMerge}
        orderId={orderId}
        onClose={() => setShowMerge(false)}
      />
      <SeatShareDialog
        open={seatShareDialog !== null}
        orderId={orderId}
        itemId={seatShareDialog?.itemId ?? null}
        initialShares={seatShareDialog?.shares ?? []}
        onClose={() => setSeatShareDialog(null)}
      />
      <RefireItemDialog
        open={refireItemId !== null}
        orderId={orderId}
        itemId={refireItemId}
        onClose={() => setRefireItemId(null)}
      />
      <TransferTableDialog
        open={showTransfer}
        orderId={orderId}
        currentTableId={order.tableId}
        onClose={() => setShowTransfer(false)}
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
        loading={updateStatus.isPending || lineAdjustments.isPending}
        onClose={() => setReasonAction(null)}
        onSubmit={(reason) => {
          if (!reasonAction) return;
          if (reasonAction.type === "cancel") {
            updateStatus.mutate(
              { id: orderId, status: "CANCELLED", ...reason },
              { onSuccess: () => setReasonAction(null) },
            );
          } else {
            submitLineAdjustment({
              action: reasonAction.type,
              itemId: reasonAction.itemId,
              reason,
            });
          }
        }}
      />
    </div>
  );
};
