import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  jsonb,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
  check,
  foreignKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant.schema";
import { branches } from "./branch.schema";
import { users } from "./auth.schema";
import { orders, orderStatusEnum } from "./order.schema";
import {
  menuItems,
  menuItemVariants,
  modifierOptions,
  menuChangeEvents,
  combos,
  comboSlotOptions,
  weightUnitEnum,
} from "./menu.schema";
import { sql } from "drizzle-orm";
import { taxModeEnum } from "./tax.schema";

export const kitchenStations = pgTable(
  "kitchen_stations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    printerIdentifier: varchar("printer_identifier", { length: 200 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantBranchIdx: index("kitchen_stations_tenant_branch_idx").on(
      t.tenantId,
      t.branchId,
    ),
    branchNameUnique: uniqueIndex("kitchen_stations_branch_name_unique").on(
      t.branchId,
      t.name,
    ),
  }),
);

export const itemStationRouting = pgTable(
  "item_station_routing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    stationId: uuid("station_id")
      .notNull()
      .references(() => kitchenStations.id, { onDelete: "cascade" }),
    modifierOptionId: uuid("modifier_option_id").references(
      () => modifierOptions.id,
      { onDelete: "cascade" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    modifierRouteUnique: uniqueIndex("item_station_routing_modifier_unique")
      .on(t.menuItemId, t.modifierOptionId)
      .where(sql`${t.modifierOptionId} is not null`),
    defaultRouteUnique: uniqueIndex("item_station_routing_default_unique")
      .on(t.menuItemId)
      .where(sql`${t.modifierOptionId} is null`),
    stationIdx: index("item_station_routing_station_idx").on(t.stationId),
  }),
);

export const kitchenTicketStatusEnum = pgEnum("kitchen_ticket_status", [
  "PENDING_PAYMENT",
  "HELD",
  "FIRED",
  "PREPARING",
  "READY",
  "SERVED",
]);

export const orderCourses = pgTable(
  "order_courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courseNumber: integer("course_number").notNull(),
    name: varchar("name", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    orderCourseUnique: uniqueIndex("order_courses_order_number_unique").on(
      t.orderId,
      t.courseNumber,
    ),
    orderIdx: index("order_courses_order_idx").on(t.orderId),
    numberPositive: check(
      "order_courses_number_positive",
      sql`${t.courseNumber} > 0`,
    ),
  }),
);

export const kitchenTickets = pgTable(
  "kitchen_tickets",
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

    ticketNumber: integer("ticket_number").notNull(),
    status: kitchenTicketStatusEnum("status").notNull().default("FIRED"),
    courseId: uuid("course_id").references(() => orderCourses.id, {
      onDelete: "set null",
    }),

    notes: text("notes"),
    customerRequestId: varchar("customer_request_id", { length: 128 }),
    firedAt: timestamp("fired_at").defaultNow(),
    readyAt: timestamp("ready_at"),
    servedAt: timestamp("served_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantBranchIdx: index("kitchen_tickets_tenant_branch_idx").on(
      t.tenantId,
      t.branchId,
    ),
    statusIdx: index("kitchen_tickets_status_idx").on(t.status),
    orderIdx: index("kitchen_tickets_order_idx").on(t.orderId),
    courseIdx: index("kitchen_tickets_course_idx").on(t.courseId),
    customerRequestUnique: uniqueIndex(
      "kitchen_tickets_customer_request_unique",
    ).on(t.orderId, t.customerRequestId),
    branchTenantFk: foreignKey({
      name: "kitchen_tickets_branch_tenant_fk",
      columns: [t.branchId, t.tenantId],
      foreignColumns: [branches.id, branches.tenantId],
    }).onDelete("cascade"),
  }),
);

export const orderItemFulfillmentTypeEnum = pgEnum(
  "order_item_fulfillment_type",
  ["DINE_IN", "TAKEAWAY"],
);

export const cancellationReasons = pgTable(
  "cancellation_reasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    tenantLabelUnique: uniqueIndex(
      "cancellation_reasons_tenant_label_unique",
    ).on(t.tenantId, t.label),
    tenantActiveIdx: index("cancellation_reasons_tenant_active_idx").on(
      t.tenantId,
      t.isActive,
    ),
  }),
);

export const orderItemStatusEnum = pgEnum("order_item_status", [
  "ACTIVE",
  "VOIDED",
  "COMPED",
  "REFIRED",
]);
export const refireTypeEnum = pgEnum("refire_type", ["REFIRE", "REFILL"]);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kitchenTicketId: uuid("kitchen_ticket_id")
      .notNull()
      .references(() => kitchenTickets.id, { onDelete: "cascade" }),

    menuItemId: uuid("menu_item_id").references(() => menuItems.id),
    comboId: uuid("combo_id").references(() => combos.id),
    comboGroupId: uuid("combo_group_id"),
    comboSlotOptionId: uuid("combo_slot_option_id").references(
      () => comboSlotOptions.id,
      { onDelete: "set null" },
    ),
    menuItemName: varchar("menu_item_name", { length: 200 }).notNull(),
    variantId: uuid("variant_id").references(() => menuItemVariants.id),

    variantName: varchar("variant_name", { length: 100 }),
    quantity: integer("quantity").notNull(),
    weightQuantity: numeric("weight_quantity", { precision: 12, scale: 4 }),
    weightUnit: weightUnitEnum("weight_unit"),
    manualPrice: numeric("manual_price", { precision: 10, scale: 2 }),
    billingExcluded: boolean("billing_excluded").notNull().default(false),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    taxMode: taxModeEnum("tax_mode").notNull().default("EXCLUSIVE"),
    pricingAttribution: jsonb("pricing_attribution").$type<{
      BASE_PRICE: number;
      VARIANT: number;
      MODIFIER: number;
      COMBO?: number;
      PROMOTION?: number;
      PROMOTION_DETAILS?: Array<{
        promotionId: string;
        name: string;
        discountAmount: number;
      }>;
      LOYALTY?: number;
      LOYALTY_DETAILS?: {
        tierId: string;
        name: string;
        discountAmount: number;
      };
      TAXABLE_BASE?: number;
      PRICE_SOURCE?: {
        kind: "PRICE_RULE" | "BRANCH_OVERRIDE" | "MENU_ITEM";
        id: string;
        description: string;
      };
    }>(),
    chefNotes: text("chef_notes"),
    seatLabel: varchar("seat_label", { length: 50 }),
    fulfillmentType: orderItemFulfillmentTypeEnum("fulfillment_type")
      .notNull()
      .default("DINE_IN"),
    stationId: uuid("station_id").references(() => kitchenStations.id, {
      onDelete: "set null",
    }),
    menuChangeEventId: uuid("menu_change_event_id").references(
      () => menuChangeEvents.id,
      { onDelete: "set null" },
    ),

    resolutionAsOf: timestamp("resolution_as_of"),
    availabilitySnapshot: jsonb("availability_snapshot").$type<{
      asOf: string;
      branchId: string;
      channel: "UNSCOPED" | "STAFF" | "CUSTOMER_QR";
      fulfillmentType:
        "UNSCOPED" | "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
      effectiveStatus: string;
      isHidden: boolean;
      reason: string | null;
      cause: string;
    } | null>(),
    pricingReplayEvidence: jsonb("pricing_replay_evidence").$type<unknown>(),
    availabilityReplayEvidence: jsonb(
      "availability_replay_evidence",
    ).$type<unknown>(),
    itemStatus: orderItemStatusEnum("item_status").notNull().default("ACTIVE"),
    refiresOrderItemId: uuid("refires_order_item_id").references(
      (): AnyPgColumn => orderItems.id,
      { onDelete: "set null" },
    ),
    refireReason: text("refire_reason"),
    refireType: refireTypeEnum("refire_type"),
    refiredBy: uuid("refired_by").references(() => users.id),
    refiredAt: timestamp("refired_at"),
    voidedReason: text("voided_reason"),
    voidedBy: uuid("voided_by").references(() => users.id),
    voidedAt: timestamp("voided_at"),
    voidedReasonId: uuid("voided_reason_id").references(
      () => cancellationReasons.id,
      { onDelete: "set null" },
    ),
    compedReason: text("comped_reason"),
    compedBy: uuid("comped_by").references(() => users.id),
    compedAt: timestamp("comped_at"),
    compedReasonId: uuid("comped_reason_id").references(
      () => cancellationReasons.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index("order_items_order_idx").on(t.orderId),
    ticketIdx: index("order_items_ticket_idx").on(t.kitchenTicketId),
    menuItemIdx: index("order_items_menu_item_idx").on(t.menuItemId),
    variantIdx: index("order_items_variant_idx").on(t.variantId),
    comboGroupIdx: index("order_items_combo_group_idx").on(t.comboGroupId),
    comboSlotOptionIdx: index("order_items_combo_slot_option_idx").on(
      t.comboSlotOptionId,
    ),
    refiresIdx: index("order_items_refires_idx").on(t.refiresOrderItemId),
    resolutionAsOfIdx: index("order_items_resolution_as_of_idx").on(
      t.resolutionAsOf,
    ),
    menuItemReplayEvidenceRequired: check(
      "order_items_menu_item_replay_evidence_required",
      sql`${t.menuItemId} IS NULL OR (${t.resolutionAsOf} IS NOT NULL AND ${t.availabilitySnapshot} IS NOT NULL AND ${t.pricingReplayEvidence} IS NOT NULL AND ${t.availabilityReplayEvidence} IS NOT NULL)`,
    ),
  }),
);

export const orderItemModifiers = pgTable(
  "order_item_modifiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    modifierId: uuid("modifier_id").references(() => modifierOptions.id),
    modifierGroupName: varchar("modifier_group_name", { length: 100 }),
    name: varchar("name", { length: 100 }).notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
    quantity: integer("quantity").notNull().default(1),
    zoneLabel: varchar("zone_label", { length: 30 }),
  },
  (t) => ({
    itemIdx: index("order_item_modifiers_item_idx").on(t.orderItemId),
  }),
);

export const orderItemSeatShares = pgTable(
  "order_item_seat_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    seatLabel: varchar("seat_label", { length: 50 }).notNull(),
    shareRatio: numeric("share_ratio", { precision: 8, scale: 6 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    itemSeatUnique: uniqueIndex("order_item_seat_shares_item_seat_unique").on(
      t.orderItemId,
      t.seatLabel,
    ),
    itemIdx: index("order_item_seat_shares_item_idx").on(t.orderItemId),
    ratioPositive: check(
      "order_item_seat_shares_ratio_positive",
      sql`${t.shareRatio} > 0 AND ${t.shareRatio} <= 1`,
    ),
  }),
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    oldStatus: orderStatusEnum("old_status"),
    newStatus: orderStatusEnum("new_status").notNull(),
    changedBy: uuid("changed_by").references(() => users.id),
    reason: text("reason"),
    cancellationReasonId: uuid("cancellation_reason_id").references(
      () => cancellationReasons.id,
      { onDelete: "set null" },
    ),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
  },
  (t) => ({ orderIdx: index("order_status_history_order_idx").on(t.orderId) }),
);
