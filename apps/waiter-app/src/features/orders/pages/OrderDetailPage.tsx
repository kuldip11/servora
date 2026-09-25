import { useCallback, useState } from "react";
import { StaleDataBanner } from "@pos/ui";
import { useOrder } from "@/features/orders/hooks/useOrder";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";
import { useUpdateTicketStatus } from "@/features/orders/hooks/useUpdateTicketStatus";
import { OrderDetailHeader } from "@/features/orders/components/OrderDetailHeader";
import { OrderBanners } from "@/features/orders/components/OrderBanners";
import { TicketGroup } from "@/features/orders/components/TicketGroup";
import { OrderTotals } from "@/features/orders/components/OrderTotals";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { OrderActions } from "@/features/orders/components/OrderActions";
import { useLineAdjustments } from "@/features/orders/hooks/useLineAdjustments";
import { hasPermission } from "@/features/auth/storage";
import type { ManagerApprovalRequest } from "@/features/orders/components/ManagerApprovalDialog";
import {
  OrderDetailDialogs,
  type OrderReasonAction,
} from "@/features/orders/components/OrderDetailDialogs";
import { extractApiError, toApiClientError } from "@pos/api-client";
import {
  OrderDetailError,
  OrderDetailLoading,
} from "@/features/orders/components/OrderDetailFeedback";
import {
  useCancellationReasons,
  useRefillOrderItem,
} from "@/features/orders/hooks/useOrderActions";

interface Props {
  orderId: string;
  onBack: () => void;
  onAddItems: (orderId: string) => void;
}

export const OrderDetailPage = ({ orderId, onBack, onAddItems }: Props) => {
  const orderQuery = useOrder(orderId);
  const { data: order, isLoading } = orderQuery;
  const updateStatus = useUpdateOrderStatus();
  const updateTicketStatus = useUpdateTicketStatus();
  const lineAdjustments = useLineAdjustments(orderId);
  const refill = useRefillOrderItem(orderId);
  const [seatShareDialog, setSeatShareDialog] = useState<{
    itemId: string;
    shares: Array<{ seatLabel: string; shareRatio: number }>;
  } | null>(null);
  const [refireItemId, setRefireItemId] = useState<string | null>(null);
  const [reasonAction, setReasonAction] = useState<OrderReasonAction>(null);
  const [pendingApproval, setPendingApproval] =
    useState<ManagerApprovalRequest | null>(null);
  const cancellationReasonsQuery = useCancellationReasons();
  const cancellationReasons = cancellationReasonsQuery.data ?? [];
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
          if (toApiClientError(error).code === "MANAGER_APPROVAL_REQUIRED") {
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

  if (isLoading) return <OrderDetailLoading onBack={onBack} />;

  if (orderQuery.isError && !order) {
    return (
      <OrderDetailError
        error={orderQuery.error}
        fetching={orderQuery.isFetching}
        onBack={onBack}
        onRetry={() => void orderQuery.refetch()}
      />
    );
  }

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

      {orderQuery.isError ? (
        <StaleDataBanner
          message="Order refresh failed — showing the latest order data available."
          isRetrying={orderQuery.isFetching}
          onRetry={() => void orderQuery.refetch()}
        />
      ) : null}

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
      <OrderDetailDialogs
        order={order}
        orderId={orderId}
        showTransfer={showTransfer}
        showSplit={showSplit}
        showMerge={showMerge}
        seatShareDialog={seatShareDialog}
        refireItemId={refireItemId}
        pendingApproval={pendingApproval}
        reasonAction={reasonAction}
        cancellationReasons={cancellationReasons}
        reasonsLoading={updateStatus.isPending || lineAdjustments.isPending}
        {...(cancellationReasonsQuery.isError
          ? {
              reasonsError: extractApiError(
                cancellationReasonsQuery.error,
                "Cancellation reasons could not be loaded.",
              ),
            }
          : {})}
        reasonsStale={
          cancellationReasonsQuery.isError &&
          cancellationReasonsQuery.data !== undefined
        }
        reasonsRetrying={cancellationReasonsQuery.isFetching}
        onRetryReasons={() => void cancellationReasonsQuery.refetch()}
        onCloseTransfer={() => setShowTransfer(false)}
        onCloseSplit={() => setShowSplit(false)}
        onCloseMerge={() => setShowMerge(false)}
        onCloseSeatShare={() => setSeatShareDialog(null)}
        onCloseRefire={() => setRefireItemId(null)}
        onCloseApproval={() => setPendingApproval(null)}
        onApproved={(approvalToken) =>
          pendingApproval &&
          submitLineAdjustment(pendingApproval, approvalToken)
        }
        onCloseReason={() => setReasonAction(null)}
        onSubmitReason={(reason) => {
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
