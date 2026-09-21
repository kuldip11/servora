import { Plus, Receipt } from "lucide-react";
import { Button } from "@pos/ui";
import type { Order } from "@pos/types";

interface Props {
  order: Order;
  canRequestBill: boolean;
  canAddItems: boolean;
  canCancel: boolean;
  allTicketsServed: boolean;
  isUpdatingStatus: boolean;
  onRequestBill: () => void;
  onAddItems: () => void;
  onCancel: () => void;
  onTransfer?: (() => void) | undefined;
  onSplit?: (() => void) | undefined;
  onMerge?: (() => void) | undefined;
}

export const OrderActions = ({
  order,
  canRequestBill,
  canAddItems,
  canCancel,
  allTicketsServed,
  isUpdatingStatus,
  onRequestBill,
  onAddItems,
  onCancel,
  onTransfer,
  onSplit,
  onMerge,
}: Props) => {
  if (!canRequestBill && !canAddItems && !canCancel) return null;

  return (
    <div className="space-y-2 border-t border-border bg-surface px-4 py-3 safe-area-bottom">
      {canRequestBill && (
        <button
          onClick={onRequestBill}
          disabled={isUpdatingStatus}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-warning font-semibold text-warning-foreground active:opacity-80 disabled:opacity-60"
        >
          <Receipt className="w-5 h-5" />
          {isUpdatingStatus ? "Updating…" : "Request Bill"}
        </button>
      )}
      {order.status === "OPEN" && !allTicketsServed && (
        <p className="text-xs text-text-disabled text-center">
          All rounds need to be served before requesting the bill.
        </p>
      )}
      {canAddItems && (
        <Button
          onClick={onAddItems}
          size="lg"
          className="min-h-12 w-full rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Add More Items
        </Button>
      )}
      {onTransfer && (
        <Button
          onClick={onTransfer}
          variant="secondary"
          size="lg"
          className="min-h-12 w-full rounded-xl"
        >
          Transfer Table
        </Button>
      )}
      {onSplit && (
        <Button
          onClick={onSplit}
          variant="secondary"
          size="lg"
          className="min-h-12 w-full rounded-xl"
        >
          Split Bill
        </Button>
      )}
      {onMerge && (
        <Button
          onClick={onMerge}
          variant="secondary"
          size="lg"
          className="min-h-12 w-full rounded-xl"
        >
          Merge Table
        </Button>
      )}
      {canCancel && (
        <button
          onClick={() => {
            if (confirm("Cancel this order?")) {
              onCancel();
            }
          }}
          className="min-h-11 w-full rounded-xl border border-danger/20 text-sm font-semibold text-danger active:bg-danger-surface"
        >
          Cancel Order
        </button>
      )}
    </div>
  );
};
