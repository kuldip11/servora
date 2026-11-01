import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  boolean,
  check,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant.schema";
import { menuCategories, menuItems } from "./menu.schema";
import { orders } from "./order.schema";

export const promotionRuleTypeEnum = pgEnum("promotion_rule_type", [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "BOGO",
]);
export const promotionScopeEnum = pgEnum("promotion_scope", [
  "ORDER",
  "CATEGORY",
  "ITEM",
]);

export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    ruleType: promotionRuleTypeEnum("rule_type").notNull(),
    scope: promotionScopeEnum("scope").notNull().default("ORDER"),
    scopeCategoryId: uuid("scope_category_id").references(
      () => menuCategories.id,
      { onDelete: "cascade" },
    ),
    scopeMenuItemId: uuid("scope_menu_item_id").references(() => menuItems.id, {
      onDelete: "cascade",
    }),
    value: numeric("value", { precision: 10, scale: 2 }),
    couponCode: varchar("coupon_code", { length: 50 }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    startTime: time("start_time"),
    endTime: time("end_time"),
    maxUsesTotal: integer("max_uses_total"),
    maxUsesPerCustomer: integer("max_uses_per_customer"),
    triggerMenuItemId: uuid("trigger_menu_item_id").references(
      () => menuItems.id,
      { onDelete: "cascade" },
    ),
    triggerCategoryId: uuid("trigger_category_id").references(
      () => menuCategories.id,
      { onDelete: "cascade" },
    ),
    rewardMenuItemId: uuid("reward_menu_item_id").references(
      () => menuItems.id,
      { onDelete: "cascade" },
    ),
    rewardCategoryId: uuid("reward_category_id").references(
      () => menuCategories.id,
      { onDelete: "cascade" },
    ),
    rewardDiscountPercent: numeric("reward_discount_percent", {
      precision: 5,
      scale: 2,
    }),
    triggerQuantity: integer("trigger_quantity"),
    rewardQuantity: integer("reward_quantity"),
    stackableWithLoyalty: boolean("stackable_with_loyalty")
      .notNull()
      .default(true),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantActiveIdx: index("promotions_tenant_active_idx").on(
      t.tenantId,
      t.isActive,
    ),
    tenantCouponUnique: uniqueIndex("promotions_tenant_coupon_unique").on(
      t.tenantId,
      t.couponCode,
    ),
    scopeTarget: check(
      "promotions_scope_target",
      sql`(${t.scope}::text = 'ORDER' AND ${t.scopeCategoryId} IS NULL AND ${t.scopeMenuItemId} IS NULL) OR (${t.scope}::text = 'CATEGORY' AND ${t.scopeCategoryId} IS NOT NULL AND ${t.scopeMenuItemId} IS NULL) OR (${t.scope}::text = 'ITEM' AND ${t.scopeCategoryId} IS NULL AND ${t.scopeMenuItemId} IS NOT NULL)`,
    ),
    valueValid: check(
      "promotions_value_valid",
      sql`(${t.ruleType}::text = 'PERCENTAGE' AND ${t.value} > 0 AND ${t.value} <= 100) OR (${t.ruleType}::text = 'FIXED_AMOUNT' AND ${t.value} > 0) OR (${t.ruleType}::text = 'BOGO' AND ${t.value} IS NULL)`,
    ),
    bogoShape: check(
      "promotions_bogo_shape",
      sql`${t.ruleType}::text <> 'BOGO' OR (((((${t.triggerMenuItemId} IS NOT NULL)::int + (${t.triggerCategoryId} IS NOT NULL)::int) = 1) AND (((${t.rewardMenuItemId} IS NOT NULL)::int + (${t.rewardCategoryId} IS NOT NULL)::int) <= 1) AND ${t.rewardDiscountPercent} > 0 AND ${t.rewardDiscountPercent} <= 100 AND ${t.triggerQuantity} > 0 AND ${t.rewardQuantity} > 0))`,
    ),
  }),
);

export const promotionRedemptions = pgTable(
  "promotion_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promotionId: uuid("promotion_id")
      .notNull()
      .references(() => promotions.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id"),
    discountAmount: numeric("discount_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("promotion_redemptions_order_idx").on(t.orderId),
    promotionIdx: index("promotion_redemptions_promotion_idx").on(
      t.promotionId,
      t.redeemedAt,
    ),
    customerIdx: index("promotion_redemptions_customer_idx").on(
      t.promotionId,
      t.customerId,
    ),
    promotionOrderUnique: uniqueIndex(
      "promotion_redemptions_promotion_order_unique",
    ).on(t.promotionId, t.orderId),
  }),
);
