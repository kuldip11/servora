import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { Button, Modal, StatusBadge } from "@pos/ui";
import type { Bill, Order } from "@pos/types";
import { billingService } from "@/features/billing/services/billing.service";
import { printBills } from "@/features/billing/utils/print-bills";
import { formatCurrency } from "@/shared/utils/format";

const fallbackBill = (order: Order): Bill => ({
  id: `order-${order.id}`,
  orderId: order.id,
  splitLabel: "Whole order",
  subtotal: Number(order.subtotal),
  taxAmount: Number(order.taxAmount),
  discountAmount: Number(order.discountAmount ?? 0),
  serviceChargeAmount: Number(order.serviceChargeAmount ?? 0),
  roundingAdjustment: 0,
  totalAmount: Number(order.totalAmount),
  gstNumber: null,
  payments: [],
  createdAt: order.createdAt,
  itemAssignments: (order.items ?? []).map((item) => ({
    id: `preview-${item.id}`,
    billId: `order-${order.id}`,
    orderItemId: item.id,
    orderItem: {
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName,
      quantity: item.quantity,
    },
  })),
});

export const PrintBillsDialog = ({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: orderBills = [] } = useQuery<Bill[]>({
    queryKey: ["billing", "order", order?.id],
    queryFn: () => billingService.getOrderBills(order!.id),
    enabled: !!order,
  });

  if (!order) return null;
  const printableBills = orderBills.length ? orderBills : [fallbackBill(order)];

  return (
    <Modal open title="Preview and print bills" size="md" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-text-primary">
            {order.table?.name
              ? `Table ${order.table.name}`
              : order.type.replace("_", " ")}
          </p>
          <p className="text-xs text-text-secondary">
            Order #{order.id.slice(-8).toUpperCase()} · Select one or more bills
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {printableBills.map((bill, index) => {
            const paid = (bill.payments ?? [])
              .filter((payment) => payment.status === "SUCCESS")
              .reduce((sum, payment) => sum + Number(payment.amount), 0);
            const due = Math.max(0, Number(bill.totalAmount) - paid);
            const selected = selectedIds.has(bill.id);
            return (
              <label
                key={bill.id}
                className={`cursor-pointer rounded-xl border p-4 ${selected ? "border-primary bg-primary-surface" : "border-border bg-surface"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {bill.splitLabel ?? `Bill ${index + 1}`}
                    </p>
                    <p className="mt-1 text-xl font-bold text-text-primary">
                      {formatCurrency(Number(bill.totalAmount))}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      const next = new Set(selectedIds);
                      if (event.target.checked) next.add(bill.id);
                      else next.delete(bill.id);
                      setSelectedIds(next);
                    }}
                    aria-label={`Select ${bill.splitLabel ?? `Bill ${index + 1}`}`}
                  />
                </div>
                <StatusBadge
                  label={due <= 0.005 ? "Paid" : `${formatCurrency(due)} due`}
                  tone={due <= 0.005 ? "success" : "warning"}
                />
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              setSelectedIds(new Set(printableBills.map((bill) => bill.id)))
            }
          >
            Select all
          </Button>
          <Button
            disabled={!selectedIds.size}
            onClick={() =>
              printBills(
                order,
                printableBills.filter((bill) => selectedIds.has(bill.id)),
              )
            }
          >
            <Printer className="h-4 w-4" /> Print selected
          </Button>
        </div>
      </div>
    </Modal>
  );
};
