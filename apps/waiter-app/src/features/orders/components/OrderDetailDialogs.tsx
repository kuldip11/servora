import type { CancellationReason, Order } from "@pos/types";
import type { ManagerApprovalRequest } from "./ManagerApprovalDialog";
import { ManagerApprovalDialog } from "./ManagerApprovalDialog";
import { MergeOrderDialog } from "./MergeOrderDialog";
import { ReasonDialog } from "./ReasonDialog";
import { RefireItemDialog } from "./RefireItemDialog";
import { SeatShareDialog } from "./SeatShareDialog";
import { SplitBillDialog } from "./SplitBillDialog";
import { TransferTableDialog } from "./TransferTableDialog";

export type OrderReasonAction =
  { type: "cancel" } | { type: "void" | "comp"; itemId: string } | null;

type SeatShareState = {
  itemId: string;
  shares: Array<{ seatLabel: string; shareRatio: number }>;
} | null;

type OrderDetailDialogsProps = {
  order: Order;
  orderId: string;
  showTransfer: boolean;
  showSplit: boolean;
  showMerge: boolean;
  seatShareDialog: SeatShareState;
  refireItemId: string | null;
  pendingApproval: ManagerApprovalRequest | null;
  reasonAction: OrderReasonAction;
  cancellationReasons: CancellationReason[];
  reasonsLoading: boolean;
  reasonsError?: string;
  reasonsStale: boolean;
  reasonsRetrying: boolean;
  onRetryReasons: () => void;
  onCloseTransfer: () => void;
  onCloseSplit: () => void;
  onCloseMerge: () => void;
  onCloseSeatShare: () => void;
  onCloseRefire: () => void;
  onCloseApproval: () => void;
  onApproved: (approvalToken: string) => void;
  onCloseReason: () => void;
  onSubmitReason: (reason: {
    cancellationReasonId?: string;
    reason?: string;
  }) => void;
};

export const OrderDetailDialogs = ({
  order,
  orderId,
  showTransfer,
  showSplit,
  showMerge,
  seatShareDialog,
  refireItemId,
  pendingApproval,
  reasonAction,
  cancellationReasons,
  reasonsLoading,
  reasonsError,
  reasonsStale,
  reasonsRetrying,
  onRetryReasons,
  onCloseTransfer,
  onCloseSplit,
  onCloseMerge,
  onCloseSeatShare,
  onCloseRefire,
  onCloseApproval,
  onApproved,
  onCloseReason,
  onSubmitReason,
}: OrderDetailDialogsProps) => (
  <>
    <SplitBillDialog
      open={showSplit}
      orderId={orderId}
      items={order.items ?? []}
      onClose={onCloseSplit}
    />
    <MergeOrderDialog
      open={showMerge}
      orderId={orderId}
      onClose={onCloseMerge}
    />
    <SeatShareDialog
      open={seatShareDialog !== null}
      orderId={orderId}
      itemId={seatShareDialog?.itemId ?? null}
      initialShares={seatShareDialog?.shares ?? []}
      onClose={onCloseSeatShare}
    />
    <RefireItemDialog
      open={refireItemId !== null}
      orderId={orderId}
      itemId={refireItemId}
      onClose={onCloseRefire}
    />
    <TransferTableDialog
      open={showTransfer}
      orderId={orderId}
      currentTableId={order.tableId}
      onClose={onCloseTransfer}
    />
    <ManagerApprovalDialog
      open={pendingApproval !== null}
      orderId={orderId}
      request={pendingApproval}
      onClose={onCloseApproval}
      onApproved={onApproved}
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
      loading={reasonsLoading}
      {...(reasonsError ? { reasonsError } : {})}
      reasonsStale={reasonsStale}
      reasonsRetrying={reasonsRetrying}
      onRetryReasons={onRetryReasons}
      onClose={onCloseReason}
      onSubmit={onSubmitReason}
    />
  </>
);
