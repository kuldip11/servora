import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
  pgEnum,
  index,
  integer,
  check,
  uniqueIndex,
  foreignKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants } from "./tenant.schema";
import { branches } from "./branch.schema";
import { users } from "./auth.schema";
import { restaurantTables } from "./restaurant-table.schema";
import { customerSessions } from "./customer-session.schema";
import { customerGroups } from "./customer-group.schema";
import { priceRules } from "./pricing.schema";
import { orderSourceEnum, orderTypeEnum } from "./order-enums.schema";

export { orderSourceEnum, orderTypeEnum } from "./order-enums.schema";

export const orderStatusEnum = pgEnum("order_status", [
  "OPEN",
  "BILL_REQUESTED",
  "PAID",
  "CLOSED",
  "CANCELLED",
]);

export const billingModeEnum = pgEnum("billing_mode", [
  "LINE_ITEMS",
  "PER_COVER",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    tableId: uuid("table_id").references(() => restaurantTables.id),
    customerId: uuid("customer_id"),
    customerGroupId: uuid("customer_group_id").references(
      () => customerGroups.id,
      { onDelete: "set null" },
    ),
    mergedIntoOrderId: uuid("merged_into_order_id").references(
      (): AnyPgColumn => orders.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by").references(() => users.id),
    source: orderSourceEnum("source").notNull().default("STAFF"),
    customerSessionId: uuid("customer_session_id").references(
      () => customerSessions.id,
    ),
    status: orderStatusEnum("status").notNull().default("OPEN"),
    type: orderTypeEnum("type").notNull(),
    billingMode: billingModeEnum("billing_mode")
      .notNull()
      .default("LINE_ITEMS"),
    coverCount: integer("cover_count"),
    perCoverPriceRuleId: uuid("per_cover_price_rule_id").references(
      () => priceRules.id,
      { onDelete: "set null" },
    ),
    perCoverRate: numeric("per_cover_rate", { precision: 10, scale: 2 }),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    taxAmount: numeric("tax_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
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
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes"),

    resolutionAsOf: timestamp("resolution_as_of"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantBranchIdx: index("orders_tenant_branch_idx").on(
      t.tenantId,
      t.branchId,
    ),
    tenantBranchCreatedAtIdx: index("orders_tenant_branch_created_at_idx").on(
      t.tenantId,
      t.branchId,
      t.createdAt,
    ),
    tenantBranchStatusCreatedAtIdx: index(
      "orders_tenant_branch_status_created_at_idx",
    ).on(t.tenantId, t.branchId, t.status, t.createdAt),
    tenantCreatedAtIdx: index("orders_tenant_created_at_idx").on(
      t.tenantId,
      t.createdAt,
    ),
    tenantShortIdIdx: index("orders_tenant_short_id_idx").on(
      t.tenantId,
      sql`right(${t.id}::text, 8)`,
    ),
    tenantBranchShortIdIdx: index("orders_tenant_branch_short_id_idx").on(
      t.tenantId,
      t.branchId,
      sql`right(${t.id}::text, 8)`,
    ),
    statusIdx: index("orders_status_idx").on(t.status),
    createdAtIdx: index("orders_created_at_idx").on(t.createdAt),
    mergedIntoIdx: index("orders_merged_into_idx").on(t.mergedIntoOrderId),
    customerSessionIdx: index("orders_customer_session_idx").on(
      t.customerSessionId,
    ),
    customerSessionActiveUnique: uniqueIndex(
      "orders_customer_session_active_unique",
    )
      .on(t.customerSessionId)
      .where(
        sql`${t.customerSessionId} IS NOT NULL AND ${t.status} NOT IN ('PAID', 'CLOSED', 'CANCELLED')`,
      ),
    customerGroupIdx: index("orders_customer_group_idx").on(t.customerGroupId),
    billingModeIdx: index("orders_billing_mode_idx").on(
      t.tenantId,
      t.billingMode,
    ),
    resolutionAsOfIdx: index("orders_resolution_as_of_idx").on(
      t.resolutionAsOf,
    ),
    perCoverFieldsValid: check(
      "orders_per_cover_fields_valid",
      sql`(${t.billingMode} = 'LINE_ITEMS' AND ${t.coverCount} IS NULL AND ${t.perCoverRate} IS NULL) OR (${t.billingMode} = 'PER_COVER' AND ${t.coverCount} > 0 AND ${t.perCoverPriceRuleId} IS NOT NULL AND ${t.perCoverRate} IS NOT NULL)`,
    ),
    branchTenantFk: foreignKey({
      name: "orders_branch_tenant_fk",
      columns: [t.branchId, t.tenantId],
      foreignColumns: [branches.id, branches.tenantId],
    }).onDelete("cascade"),
  }),
);
