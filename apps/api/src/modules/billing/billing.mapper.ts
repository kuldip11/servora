import type {
  BillResponse,
  BillingPaymentResponse,
  PaymentCollectionResultResponse,
  PaymentRefundResponse,
  SeatSplitResultResponse,
} from "@pos/contracts";
import { InternalError } from "@/core/errors";
import {
  billOrderItems,
  bills,
  orderItems,
  payments,
  paymentRefunds,
} from "@/db/schema";

export type BillRecord = typeof bills.$inferSelect;
type PaymentRecord = typeof payments.$inferSelect;
type RefundRecord = typeof paymentRefunds.$inferSelect;
type BillAssignmentRecord = typeof billOrderItems.$inferSelect & {
  orderItem?:
    | (typeof orderItems.$inferSelect & {
        order?: { id: string; table?: { name: string } | null } | null;
      })
    | null;
};
type BillWithRelations = BillRecord & {
  payments?: PaymentRecord[];
  itemAssignments?: BillAssignmentRecord[];
};

const numberFromDecimal = (value: string | number): number => Number(value);

export const toBillingPaymentResponse = (
  payment: PaymentRecord | null | undefined,
): BillingPaymentResponse => {
  if (!payment) throw new InternalError("Payment response could not be loaded");
  return {
    id: payment.id,
    orderId: payment.orderId,
    billId: payment.billId,
    method: payment.method,
    status: payment.status,
    amount: numberFromDecimal(payment.amount),
    reference: payment.reference,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
};

export const toBillResponse = (
  bill: BillWithRelations | null | undefined,
): BillResponse => {
  if (!bill) throw new InternalError("Bill response could not be loaded");
  return {
    id: bill.id,
    orderId: bill.orderId,
    splitLabel: bill.splitLabel,
    subtotal: numberFromDecimal(bill.subtotal),
    taxAmount: numberFromDecimal(bill.taxAmount),
    discountAmount: numberFromDecimal(bill.discountAmount),
    serviceChargeAmount: numberFromDecimal(bill.serviceChargeAmount),
    roundingAdjustment: numberFromDecimal(bill.roundingAdjustment),
    totalAmount: numberFromDecimal(bill.totalAmount),
    gstNumber: bill.gstNumber,
    payments: (bill.payments ?? []).map(toBillingPaymentResponse),
    ...(bill.itemAssignments !== undefined
      ? {
          itemAssignments: bill.itemAssignments.flatMap((assignment) => {
            const item = assignment.orderItem;
            if (!item?.order) return [];
            return [
              {
                id: assignment.id,
                billId: assignment.billId,
                orderItemId: assignment.orderItemId,
                allocationRatio: numberFromDecimal(assignment.allocationRatio),
                orderItem: {
                  menuItemId: item.menuItemId,
                  menuItemName: item.menuItemName,
                  quantity: item.quantity,
                  taxMode: item.taxMode,
                  comboId: item.comboId,
                  comboGroupId: item.comboGroupId,
                  order: {
                    id: item.order.id,
                    table: item.order.table
                      ? { name: item.order.table.name }
                      : null,
                  },
                },
              },
            ];
          }),
        }
      : {}),
    createdAt: bill.createdAt.toISOString(),
  };
};

export const toPaymentCollectionResultResponse = (value: {
  bill: BillWithRelations;
  payment: PaymentRecord;
  paymentState: "PAID" | "PARTIALLY_PAID";
}): PaymentCollectionResultResponse => ({
  bill: toBillResponse(value.bill),
  payment: toBillingPaymentResponse(value.payment),
  paymentState: value.paymentState,
});

export const toPaymentRefundResponse = (
  refund: RefundRecord | null | undefined,
): PaymentRefundResponse => {
  if (!refund) throw new InternalError("Refund response could not be loaded");
  return {
    id: refund.id,
    paymentId: refund.paymentId,
    amount: numberFromDecimal(refund.amount),
    reason: refund.reason,
    createdAt: refund.createdAt.toISOString(),
  };
};

export const toSeatSplitResultResponse = (
  value:
    | { status: "CREATED"; bills: BillWithRelations[] }
    | {
        status: "MANUAL_REQUIRED";
        allocations: Array<
          | { label?: string | undefined; orderItemIds: string[] }
          | {
              label?: string | undefined;
              itemShares: Array<{ orderItemId: string; shareRatio: number }>;
            }
        >;
        sharedItemIds: string[];
      },
): SeatSplitResultResponse => {
  if (value.status === "CREATED") {
    return { status: "CREATED", bills: value.bills.map(toBillResponse) };
  }
  return {
    status: "MANUAL_REQUIRED",
    allocations: value.allocations.map((allocation) => {
      if ("orderItemIds" in allocation) {
        return {
          ...(allocation.label !== undefined
            ? { label: allocation.label }
            : {}),
          orderItemIds: [...allocation.orderItemIds],
        };
      }
      return {
        ...(allocation.label !== undefined ? { label: allocation.label } : {}),
        itemShares: allocation.itemShares.map((share) => ({ ...share })),
      };
    }),
    sharedItemIds: [...value.sharedItemIds],
  } as SeatSplitResultResponse;
};
