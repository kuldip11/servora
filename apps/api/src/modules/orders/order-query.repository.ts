import { and, asc, count, desc, eq, exists, inArray, sql } from "drizzle-orm";
import type { OrderStatus, OrderType } from "@pos/types";
import { db } from "@/db";
import { kitchenTickets, orders, orderStatusHistory } from "@/db/schema";

export const orderQueryRepository = {
  async findById(tenantId: string, orderId: string) {
    return db.query.orders.findFirst({
      where: and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)),
      with: {
        items: {
          with: {
            modifiers: true,
            station: true,
            seatShares: true,
            comboSlotOption: true,
          },
        },
        kitchenTickets: {
          with: {
            course: true,
            items: {
              with: {
                modifiers: true,
                station: true,
                seatShares: true,
                comboSlotOption: true,
              },
            },
          },
          orderBy: asc(kitchenTickets.ticketNumber),
        },
        statusHistory: {
          with: { cancellationReason: true },
          orderBy: desc(orderStatusHistory.changedAt),
        },
        table: true,
        createdByUser: true,
        bills: { with: { payments: true, itemAssignments: true } },
        payments: true,
      },
    });
  },

  async findMany(
    tenantId: string,
    branchId: string | null | undefined,
    filters?: {
      status?: string | undefined;
      type?: string | undefined;
      search?: string | undefined;
      view?: "READY" | "ACTIVE" | "ALL" | undefined;
      page?: number | undefined;
      limit?: number | undefined;
      sortBy?: "id" | "total" | "createdAt" | undefined;
      sortDirection?: "asc" | "desc" | undefined;
    },
  ) {
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 25));
    const search = filters?.search?.trim();
    const where = and(
      eq(orders.tenantId, tenantId),
      branchId ? eq(orders.branchId, branchId) : undefined,
      filters?.status
        ? eq(orders.status, filters.status as OrderStatus)
        : undefined,
      filters?.type ? eq(orders.type, filters.type as OrderType) : undefined,
      search
        ? sql`${orders.id}::text ILIKE ${`%${search.replace(/^#/, "")}%`}`
        : undefined,
      filters?.view === "ACTIVE"
        ? inArray(orders.status, ["OPEN", "BILL_REQUESTED"])
        : undefined,
      filters?.view === "READY"
        ? exists(
            db
              .select({ value: sql`1` })
              .from(kitchenTickets)
              .where(
                and(
                  eq(kitchenTickets.orderId, orders.id),
                  eq(kitchenTickets.status, "READY"),
                ),
              ),
          )
        : undefined,
    );
    const sortColumn =
      filters?.sortBy === "id"
        ? orders.id
        : filters?.sortBy === "total"
          ? orders.totalAmount
          : orders.createdAt;
    const orderBy =
      filters?.sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);
    const [rows, totals] = await Promise.all([
      db.query.orders.findMany({
        where,
        with: {
          items: true,
          kitchenTickets: {
            columns: { id: true, status: true, ticketNumber: true },
          },
          table: true,
          createdByUser: true,
          payments: true,
        },
        orderBy,
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: count() }).from(orders).where(where),
    ]);
    return { items: rows, total: totals[0]?.total ?? 0, page, limit };
  },
};
