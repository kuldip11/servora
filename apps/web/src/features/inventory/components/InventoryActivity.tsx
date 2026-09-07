import { History } from "lucide-react";
import { Badge, Card, StatusBadge } from "@pos/ui";
import type { useInventoryTransactions } from "@/features/inventory/hooks/useInventoryTransactions";
type Transactions = ReturnType<typeof useInventoryTransactions>["data"];
export const InventoryActivity = ({
  transactions,
}: {
  transactions: Transactions;
}) => (
  <Card padding="md">
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <History className="h-4 w-4" /> Recent stock activity
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Latest restocks, usage, waste and corrections in the current scope.
        </p>
      </div>
      <Badge>{transactions?.length ?? 0} changes</Badge>
    </div>
    {!transactions?.length ? (
      <p className="py-6 text-center text-sm text-text-disabled">
        No stock changes recorded yet
      </p>
    ) : (
      <div className="divide-y divide-border">
        {transactions.slice(0, 12).map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-3 py-3 text-sm"
          >
            <StatusBadge
              label={
                transaction.reversalOfDeductionId
                  ? "VOID REVERSAL"
                  : transaction.transactionType.replace("_", " ")
              }
              tone={
                transaction.transactionType === "IN"
                  ? "success"
                  : transaction.transactionType === "WASTE"
                    ? "danger"
                    : "neutral"
              }
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-text-primary">
                {transaction.inventoryItem?.name ?? "Inventory item"}
              </p>
              <p className="truncate text-xs text-text-secondary">
                {transaction.wasteReason?.label
                  ? `${transaction.wasteReason.label}${transaction.notes ? ` · ${transaction.notes}` : ""}`
                  : transaction.notes || "No note"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-text-primary">
                {transaction.quantity} {transaction.inventoryItem?.unit ?? ""}
              </p>
              <p className="text-xs text-text-disabled">
                {new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);
