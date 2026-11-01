import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./order.schema";
import { orderItems } from "./kitchen.schema";
import { users } from "./auth.schema";

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "CARD",
  "UPI",
  "RAZORPAY",
  "STRIPE",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
]);

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    splitLabel: varchar("split_label", { length: 100 }),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
    discountAmount: numeric("discount_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    serviceChargeAmount: numeric("service_charge_amount", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    roundingAdjustment: numeric("rounding_adjustment", {
      precision: 10,
      scale: 2,
    })
      .notNull()
      .default("0"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    gstNumber: varchar("gst_number", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ orderIdx: index("bills_order_idx").on(t.orderId) }),
);

export const billOrderItems = pgTable(
  "bill_order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    allocationRatio: numeric("allocation_ratio", { precision: 8, scale: 6 })
      .notNull()
      .default("1"),
  },
  (t) => ({
    billIdx: index("bill_order_items_bill_idx").on(t.billId),
    itemIdx: index("bill_order_items_order_item_idx").on(t.orderItemId),
    billOrderItemUnique: uniqueIndex(
      "bill_order_items_bill_order_item_unique",
    ).on(t.billId, t.orderItemId),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    billId: uuid("bill_id").references(() => bills.id),
    method: paymentMethodEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    reference: varchar("reference", { length: 255 }),
    gatewayOrderId: varchar("gateway_order_id", { length: 255 }),
    gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
    metadata: text("metadata").default("{}"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("payments_order_idx").on(t.orderId),
    billIdx: index("payments_bill_idx").on(t.billId),
    gatewayPaymentUnique: uniqueIndex("payments_gateway_payment_id_unique")
      .on(t.gatewayPaymentId)
      .where(sql`${t.gatewayPaymentId} IS NOT NULL`),
  }),
);

export const paymentRefunds = pgTable(
  "payment_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    processedBy: uuid("processed_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ paymentIdx: index("payment_refunds_payment_idx").on(t.paymentId) }),
);
