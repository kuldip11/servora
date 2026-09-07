import { and, eq, inArray } from "drizzle-orm";
import type { AuthContext } from "@/core/auth";
import { ValidationError, ForbiddenError } from "@/core/errors";
import { db } from "@/db";
import { customerRequests } from "@/db/schema/customer-request.schema";
import { orders } from "@/db/schema/order.schema";
import type {
  CustomerRequest,
  CustomerRequestStatus,
  CustomerRequestType,
  Order,
} from "@pos/types";
import { customerService } from "./customer.service";
import { eventBus } from "@/lib/event-bus";
import { ticketRepository } from "@/modules/kitchen-tickets/ticket.repository";

const activeStatuses: CustomerRequestStatus[] = ["OPEN", "ACKNOWLEDGED"];

export const customerRequestService = {
  async create(
    token: string,
    input: { type: CustomerRequestType; note?: string; orderId?: string },
  ) {
    const session = await customerService.getSession(token);
    if (!session.tableId)
      throw new ValidationError(
        "Customer requests are only available for dine-in sessions",
      );
    if (input.orderId) {
      const order = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, input.orderId),
          eq(orders.tenantId, session.tenantId),
          eq(orders.branchId, session.branchId),
          eq(orders.customerSessionId, session.id),
          eq(orders.tableId, session.tableId),
        ),
      });
      if (!order)
        throw new ValidationError(
          "Order does not belong to this customer session",
        );
    }
    const [request] = await db
      .insert(customerRequests)
      .values({
        tenantId: session.tenantId,
        branchId: session.branchId,
        tableId: session.tableId,
        customerSessionId: session.id,
        orderId: input.orderId ?? null,
        type: input.type,
        note: input.note ?? null,
      })
      .returning();
    if (!request)
      throw new ValidationError("Unable to create customer request");

    if (input.type === "BILL" && input.orderId) {
      const order = await db.query.orders.findFirst({
        where: and(
          eq(orders.id, input.orderId),
          eq(orders.tenantId, session.tenantId),
          eq(orders.branchId, session.branchId),
          eq(orders.customerSessionId, session.id),
        ),
      });
      if (order && order.status === "OPEN") {
        const allServed = await ticketRepository.allServed(
          session.tenantId,
          order.id,
        );
        if (allServed) {
          const [updated] = await db
            .update(orders)
            .set({ status: "BILL_REQUESTED", updatedAt: new Date() })
            .where(and(eq(orders.id, order.id), eq(orders.status, "OPEN")))
            .returning();
          if (updated) {
            await eventBus.publish(
              { type: "order.updated", payload: updated as unknown as Order },
              session.tenantId,
              session.branchId,
            );
          }
        }
      }
    }

    await eventBus.publish(
      {
        type: "customer.request.created",
        payload: request as unknown as CustomerRequest,
      },
      session.tenantId,
      session.branchId,
    );
    return request;
  },

  async listForStaff(auth: AuthContext) {
    if (!auth.permissions.includes("orders:read"))
      throw new ForbiddenError("Insufficient permissions");
    const where =
      auth.tenantWide && !auth.branchId
        ? and(
            eq(customerRequests.tenantId, auth.tenantId),
            inArray(customerRequests.status, activeStatuses),
          )
        : and(
            eq(customerRequests.tenantId, auth.tenantId),
            eq(customerRequests.branchId, auth.branchId!),
            inArray(customerRequests.status, activeStatuses),
          );
    return db
      .select()
      .from(customerRequests)
      .where(where)
      .orderBy(customerRequests.createdAt);
  },

  async updateForStaff(
    auth: AuthContext,
    id: string,
    status: CustomerRequestStatus,
  ) {
    if (!auth.permissions.includes("orders:update"))
      throw new ForbiddenError("Insufficient permissions");
    const current = await db.query.customerRequests.findFirst({
      where: and(
        eq(customerRequests.id, id),
        eq(customerRequests.tenantId, auth.tenantId),
      ),
    });
    if (!current) throw new ValidationError("Customer request not found");
    if (auth.branchId && current.branchId !== auth.branchId)
      throw new ForbiddenError("Customer request branch access denied");
    if (status === "OPEN")
      throw new ValidationError("A request cannot be reopened");
    const [updated] = await db
      .update(customerRequests)
      .set({ status, resolvedBy: auth.userId, updatedAt: new Date() })
      .where(eq(customerRequests.id, id))
      .returning();
    await eventBus.publish(
      {
        type: "customer.request.updated",
        payload: updated as unknown as CustomerRequest,
      },
      current.tenantId,
      current.branchId,
    );
    return updated;
  },
};
