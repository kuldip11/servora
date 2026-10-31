import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { bills, orderItems, orders } from "@/db/schema";

export const billingQueryRepository = {
  async findBillsByOrder(data: {
    orderId: string;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
  }) {
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, data.orderId),
        eq(orders.tenantId, data.tenantId),
      ),
    });
    if (!order || (data.branchId && order.branchId !== data.branchId))
      return undefined;
    const orderBills = await db.query.bills.findMany({
      where: eq(bills.orderId, data.orderId),
      with: {
        payments: true,
        itemAssignments: {
          with: { orderItem: { with: { order: { with: { table: true } } } } },
        },
      },
    });
    return { bills: orderBills, orderBranchId: order.branchId };
  },

  async findActiveItemsForSeatSplit(data: {
    orderId: string;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
  }) {
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, data.orderId),
        eq(orders.tenantId, data.tenantId),
      ),
    });
    if (!order || (data.branchId && order.branchId !== data.branchId))
      return undefined;
    const items = await db.query.orderItems.findMany({
      where: and(
        eq(orderItems.orderId, data.orderId),
        eq(orderItems.billingExcluded, false),
        or(
          eq(orderItems.itemStatus, "ACTIVE"),
          and(
            eq(orderItems.itemStatus, "REFIRED"),
            isNull(orderItems.compedAt),
          ),
        ),
      ),
      with: { seatShares: true },
    });
    return { orderBranchId: order.branchId, items };
  },

  async findBillById(data: {
    billId: string;
    tenantId: string;
    branchId: string | null;
    tenantWide?: boolean | undefined;
  }) {
    const [row] = await db
      .select({ bill: bills, orderBranchId: orders.branchId })
      .from(bills)
      .innerJoin(orders, eq(orders.id, bills.orderId))
      .where(
        data.branchId
          ? and(
              eq(bills.id, data.billId),
              eq(orders.tenantId, data.tenantId),
              eq(orders.branchId, data.branchId),
            )
          : and(eq(bills.id, data.billId), eq(orders.tenantId, data.tenantId)),
      );
    if (!row) return undefined;
    const bill = await db.query.bills.findFirst({
      where: eq(bills.id, data.billId),
      with: { payments: true },
    });
    return bill ? { bill, orderBranchId: row.orderBranchId } : undefined;
  },
};
