import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Modal, Select } from "@pos/ui";
import type { Bill, Order } from "@pos/types";
import { createPaymentSchema } from "@pos/validation";
import { PAYMENT_METHODS } from "@/features/billing/constants";
import { useCollectPayment } from "@/features/billing/hooks/useCollectPayment";
import { billingService } from "@/features/billing/services/billing.service";
import { formatCurrency } from "@/shared/utils/format";
import { BillItemSummary } from "./BillItemSummary";

type PaymentForm = {
  method: string;
  amount: string;
  reference: string;
};

const paidAmount = (payments: Order["payments"] | Bill["payments"]) =>
  (payments ?? [])
    .filter((payment) => payment.status === "SUCCESS")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

const initialPaymentForm = (order: Order): PaymentForm => ({
  method: "CASH",
  amount: Math.max(
    0,
    Number(order.totalAmount) - paidAmount(order.payments),
  ).toFixed(2),
  reference: "",
});

export const PaymentDialog = ({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<PaymentForm>(() =>
    order
      ? initialPaymentForm(order)
      : { method: "CASH", amount: "", reference: "" },
  );
  const [selectedBillId, setSelectedBillId] = useState("");
  const [validationError, setValidationError] = useState("");
  const payMutation = useCollectPayment();
  const { data: orderBills = [] } = useQuery<Bill[]>({
    queryKey: ["billing", "order", order?.id],
    queryFn: () => billingService.getOrderBills(order!.id),
    enabled: !!order,
  });

  if (!order) return null;

  const unpaidBills = orderBills.filter(
    (bill) => Number(bill.totalAmount) - paidAmount(bill.payments) > 0.005,
  );
  const selectedBill = orderBills.find((bill) => bill.id === selectedBillId);

  const submit = () => {
    const parsed = createPaymentSchema.safeParse({
      orderId: order.id,
      method: form.method,
      amount: Number(form.amount),
      ...(form.reference ? { reference: form.reference } : {}),
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ?? "Please review the payment.",
      );
      return;
    }
    setValidationError("");
    payMutation.mutate(
      {
        orderId: order.id,
        input: {
          ...(selectedBillId ? { billId: selectedBillId } : {}),
          method: parsed.data.method,
          amount: parsed.data.amount,
          ...(parsed.data.reference
            ? { reference: parsed.data.reference }
            : {}),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal open title="Collect Payment" size="sm" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-surface-secondary p-3">
          <p className="mb-1 text-xs text-text-secondary">
            Order #{order.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(
              Math.max(
                0,
                Number(order.totalAmount) - paidAmount(order.payments),
              ),
            )}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Outstanding balance
          </p>
        </div>

        {selectedBill && (
          <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Subtotal</span>
              <span>{formatCurrency(Number(selectedBill.subtotal))}</span>
            </div>
            {Number(selectedBill.discountAmount) > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount</span>
                <span>
                  -{formatCurrency(Number(selectedBill.discountAmount))}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-secondary">
                {(() => {
                  const modes = (selectedBill.itemAssignments ?? [])
                    .map((assignment) => assignment.orderItem?.taxMode)
                    .filter(
                      (mode): mode is "INCLUSIVE" | "EXCLUSIVE" => !!mode,
                    );
                  const inclusive = modes.includes("INCLUSIVE");
                  const exclusive = modes.includes("EXCLUSIVE");
                  return inclusive
                    ? exclusive
                      ? "Tax (mixed included/exclusive)"
                      : "Tax included"
                    : "Tax";
                })()}
              </span>
              <span>{formatCurrency(Number(selectedBill.taxAmount))}</span>
            </div>
            {Number(selectedBill.serviceChargeAmount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Service charge</span>
                <span>
                  {formatCurrency(Number(selectedBill.serviceChargeAmount))}
                </span>
              </div>
            )}
            {Math.abs(Number(selectedBill.roundingAdjustment ?? 0)) >=
              0.005 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Rounding</span>
                <span>
                  {formatCurrency(Number(selectedBill.roundingAdjustment))}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(Number(selectedBill.totalAmount))}</span>
            </div>
          </div>
        )}

        {selectedBill &&
          (() => {
            const groups = new Map<
              string,
              NonNullable<Bill["itemAssignments"]>
            >();
            for (const assignment of selectedBill.itemAssignments ?? []) {
              const label =
                assignment.orderItem?.order?.table?.name ??
                `Order ${assignment.orderItem?.order?.id.slice(-8) ?? ""}`;
              groups.set(label, [...(groups.get(label) ?? []), assignment]);
            }
            return groups.size > 0 ? (
              <div className="space-y-3 rounded-lg border border-border p-3">
                {[...groups.entries()].map(([label, assignments]) => (
                  <div key={label}>
                    <p className="mb-1 text-xs font-semibold text-text-secondary">
                      {label}
                    </p>
                    <BillItemSummary assignments={assignments} />
                  </div>
                ))}
              </div>
            ) : null;
          })()}

        <Select
          label="Bill"
          options={[
            {
              value: "",
              label: unpaidBills.length > 1 ? "Select a bill" : "Whole order",
            },
            ...unpaidBills.map((bill, index) => ({
              value: bill.id,
              label: `${bill.splitLabel ?? `Bill ${index + 1}`} — ${formatCurrency(Number(bill.totalAmount))}`,
            })),
          ]}
          value={selectedBillId}
          onChange={(event) => {
            const id = event.target.value;
            setSelectedBillId(id);
            const bill = orderBills.find((candidate) => candidate.id === id);
            if (bill) {
              setForm((current) => ({
                ...current,
                amount: Math.max(
                  0,
                  Number(bill.totalAmount) - paidAmount(bill.payments),
                ).toFixed(2),
              }));
            }
          }}
        />
        <Select
          label="Payment Method"
          options={PAYMENT_METHODS}
          value={form.method}
          onChange={(event) =>
            setForm((current) => ({ ...current, method: event.target.value }))
          }
        />
        <Input
          label="Amount"
          type="number"
          value={form.amount}
          onChange={(event) =>
            setForm((current) => ({ ...current, amount: event.target.value }))
          }
          min="0"
          step="0.01"
        />
        {form.method !== "CASH" && (
          <Input
            label="Reference / Transaction ID"
            placeholder="Optional"
            value={form.reference}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reference: event.target.value,
              }))
            }
          />
        )}
        {validationError && (
          <p className="text-xs text-danger">{validationError}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={payMutation.isPending} onClick={submit}>
            Confirm Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
