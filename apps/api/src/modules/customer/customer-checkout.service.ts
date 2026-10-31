import { and, eq, sql } from "drizzle-orm";
import { ValidationError } from "@/core/errors";
import { db } from "@/db";
import { bills, orders, payments } from "@/db/schema";
import { customerSessionService } from "./customer-session.service";
import type { CustomerCheckoutInput } from "./customer-payment.types";

export const customerCheckoutService = {
  async checkout(token: string, input: CustomerCheckoutInput) {
    const session = await customerSessionService.getSession(token);
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, input.orderId),
        eq(orders.tenantId, session.tenantId),
        eq(orders.branchId, session.branchId),
        eq(orders.customerSessionId, session.id),
      ),
    });
    if (!order) {
      throw new ValidationError(
        "Order does not belong to this customer session",
      );
    }
    if (order.status === "CANCELLED" || order.status === "CLOSED") {
      throw new ValidationError("This order can no longer be checked out");
    }
    if (order.status !== "BILL_REQUESTED") {
      throw new ValidationError("Request the bill before making a payment");
    }

    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${order.id}))`,
      );
      const current = await tx.query.orders.findFirst({
        where: eq(orders.id, order.id),
        with: { payments: true },
      });
      if (!current) throw new ValidationError("Order no longer exists");

      const orderBills = await tx.query.bills.findMany({
        where: eq(bills.orderId, current.id),
      });
      const bill = input.billId
        ? orderBills.find((candidate) => candidate.id === input.billId)
        : orderBills.length === 1
          ? orderBills[0]
          : undefined;
      if (orderBills.length > 1 && !bill) {
        throw new ValidationError("Select the bill to check out");
      }
      const existing = current.payments.find(
        (payment) =>
          payment.status === "PENDING" && (!bill || payment.billId === bill.id),
      );
      if (existing) {
        return {
          payment: existing,
          orderStatus: current.status,
          paymentRequired: true,
          method: existing.method as "CASH",
        };
      }
      const successful = current.payments.find(
        (payment) =>
          payment.status === "SUCCESS" && (!bill || payment.billId === bill.id),
      );
      if (successful) {
        return {
          payment: successful,
          orderStatus: current.status,
          paymentRequired: false,
          method: "CASH" as const,
        };
      }

      let selectedBill = bill;
      if (!selectedBill) {
        const [createdBill] = await tx
          .insert(bills)
          .values({
            orderId: current.id,
            subtotal: current.subtotal,
            taxAmount: current.taxAmount,
            discountAmount: current.discountAmount,
            serviceChargeAmount: current.serviceChargeAmount,
            roundingAdjustment: current.roundingAdjustment,
            totalAmount: current.totalAmount,
          })
          .returning();
        selectedBill = createdBill!;
      }
      const [payment] = await tx
        .insert(payments)
        .values({
          orderId: current.id,
          billId: selectedBill.id,
          method: input.method,
          amount: selectedBill.totalAmount,
          status: "PENDING",
          reference: null,
        })
        .returning();

      return {
        payment: payment!,
        orderStatus: current.status,
        paymentRequired: true,
        method: input.method,
      };
    });
  },
};
