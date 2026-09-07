import type { RestaurantTable } from "./common";

export type OrderStatus =
  "OPEN" | "BILL_REQUESTED" | "PAID" | "CLOSED" | "CANCELLED";

export type KitchenTicketStatus =
  "PENDING_PAYMENT" | "FIRED" | "PREPARING" | "READY" | "SERVED" | "HELD";

export type OrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
export type OrderItemFulfillmentType = "DINE_IN" | "TAKEAWAY";
export type OrderItemStatus = "ACTIVE" | "VOIDED" | "COMPED" | "REFIRED";

export interface CancellationReason {
  id: string;
  tenantId: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  mergedIntoOrderId?: string | null;
  tenantId: string;
  branchId: string;
  tableId: string | null;
  table?: RestaurantTable | null;
  customerId: string | null;
  customerGroupId?: string | null;
  status: OrderStatus;
  type: OrderType;
  billingMode?: "LINE_ITEMS" | "PER_COVER";
  coverCount?: number | null;
  perCoverPriceRuleId?: string | null;
  perCoverRate?: number | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  serviceChargeAmount: number;
  roundingAdjustment: number;
  totalAmount: number;
  notes: string | null;
  resolutionAsOf?: string | null;
  items: OrderItem[];
  kitchenTickets?: KitchenTicket[];
  statusHistory: OrderStatusHistory[];
  payments?: import("./billing").Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderCourse {
  id: string;
  orderId: string;
  courseNumber: number;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KitchenTicket {
  id: string;
  tenantId: string;
  branchId: string;
  orderId: string;
  order?: Order;
  ticketNumber: number;
  status: KitchenTicketStatus;
  courseId: string | null;
  course?: OrderCourse | null;
  notes: string | null;
  resolutionAsOf?: string | null;
  items: OrderItem[];
  firedAt: string | null;
  readyAt: string | null;
  servedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;

  menuItemId: string | null;
  menuItemName: string;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  weightQuantity?: number | string | null;
  weightUnit?: "G" | "KG" | "LB" | "OZ" | null;
  manualPrice?: number | string | null;
  billingExcluded?: boolean;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxMode: "INCLUSIVE" | "EXCLUSIVE";
  pricingAttribution: Record<string, unknown> | null;
  comboId?: string | null;
  comboGroupId?: string | null;
  comboSlotOptionId?: string | null;
  comboSlotOption?: { id: string; isUnlimitedRefill: boolean } | null;
  chefNotes: string | null;
  seatLabel?: string | null;
  fulfillmentType: OrderItemFulfillmentType;
  stationId: string | null;
  menuChangeEventId: string | null;
  resolutionAsOf?: string | null;
  availabilitySnapshot?: {
    asOf: string;
    branchId: string;
    channel: "UNSCOPED" | "STAFF" | "CUSTOMER_QR";
    fulfillmentType:
      "UNSCOPED" | "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE";
    effectiveStatus: string;
    isHidden: boolean;
    reason: string | null;
    cause: string;
  } | null;
  itemStatus: OrderItemStatus;
  refiresOrderItemId: string | null;
  refireReason: string | null;
  refireType?: "REFIRE" | "REFILL" | null;
  refiredBy: string | null;
  refiredAt: string | null;
  voidedReason: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  voidedReasonId: string | null;
  compedReason: string | null;
  compedBy: string | null;
  compedAt: string | null;
  compedReasonId: string | null;
  station?: { id: string; name: string } | null;
  modifiers: OrderItemModifier[];
  seatShares?: Array<{
    id?: string;
    seatLabel: string;
    shareRatio: number | string;
  }>;
  createdAt?: string;
}

export interface OrderItemModifier {
  modifierId: string;
  modifierGroupName: string | null;
  name: string;
  price: number;
  quantity: number;
  zoneLabel?: string | null;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string;
  reason: string | null;
  cancellationReasonId: string | null;
  cancellationReason?: CancellationReason | null;
  changedAt: string;
}
