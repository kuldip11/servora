import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant.schema";
import { branches } from "./branch.schema";
import { users } from "./auth.schema";
import { orders } from "./order.schema";
import { kitchenTickets } from "./kitchen.schema";

export interface InventoryDeductionJobItem {
  orderItemId: string;
  menuItemId: string;
  variantId?: string | null;
  quantity: number;
  weightQuantity?: number | string | null;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null;
  selectedOptions?: Array<{ optionId: string; quantity?: number }>;
}

export const inventoryDeductionJobs = pgTable(
  "inventory_deduction_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kitchenTicketId: uuid("kitchen_ticket_id")
      .notNull()
      .references(() => kitchenTickets.id, { onDelete: "cascade" }),
    items: jsonb("items").$type<InventoryDeductionJobItem[]>().notNull(),
    performedBy: uuid("performed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
    lastError: text("last_error"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    retryIdx: index("inventory_deduction_jobs_retry_idx").on(
      t.status,
      t.nextAttemptAt,
    ),
    orderTicketUnique: uniqueIndex(
      "inventory_deduction_jobs_order_ticket_unique",
    ).on(t.orderId, t.kitchenTicketId),
  }),
);
