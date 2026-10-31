import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { orders } from "./order.schema";
import { payments } from "./billing.schema";

export const paymentCollectionRequests = pgTable(
  "payment_collection_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    requestKey: uuid("request_key").notNull(),
    requestFingerprint: varchar("request_fingerprint", {
      length: 64,
    }).notNull(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orderKeyUnique: uniqueIndex(
      "payment_collection_requests_order_key_unique",
    ).on(table.orderId, table.requestKey),
  }),
);
