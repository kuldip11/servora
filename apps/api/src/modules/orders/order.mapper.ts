import { InternalError } from "@/core/errors";
import type {
  OrderInventoryImpactResponse,
  OrderListItemResponse,
  OrderMergeResponse,
  OrderResponse,
} from "@pos/contracts";
import type { orderRepository } from "./order.repository";
import type { inventoryRepository } from "@/modules/inventory/inventory.repository";

type OrderAggregate = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findById>>
>;
type OrderListAggregate = Awaited<
  ReturnType<typeof orderRepository.findMany>
>["items"][number];
type OrderItemAggregate = OrderAggregate["items"][number];
type KitchenTicketAggregate = OrderAggregate["kitchenTickets"][number];
type StatusHistoryAggregate = OrderAggregate["statusHistory"][number];
type PaymentAggregate = OrderAggregate["payments"][number];
type InventoryImpactAggregate = Awaited<
  ReturnType<typeof inventoryRepository.findOrderDeductions>
>[number];

const numberOrNull = (
  value: string | number | null | undefined,
): number | null => (value == null ? null : Number(value));

const isoOrNull = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

const parseMetadata = (value: string | null): Record<string, unknown> => {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

const toOrderItemResponse = (
  item: OrderItemAggregate,
): OrderResponse["items"][number] => ({
  id: item.id,
  orderId: item.orderId,
  menuItemId: item.menuItemId,
  menuItemName: item.menuItemName,
  variantId: item.variantId,
  variantName: item.variantName,
  quantity: item.quantity,
  weightQuantity: numberOrNull(item.weightQuantity),
  weightUnit: item.weightUnit,
  manualPrice: numberOrNull(item.manualPrice),
  billingExcluded: item.billingExcluded,
  unitPrice: Number(item.unitPrice),
  subtotal: Number(item.subtotal),
  taxRate: Number(item.taxRate),
  taxMode: item.taxMode,
  pricingAttribution: item.pricingAttribution ?? null,
  comboId: item.comboId,
  comboGroupId: item.comboGroupId,
  comboSlotOptionId: item.comboSlotOptionId,
  comboSlotOption: item.comboSlotOption
    ? {
        id: item.comboSlotOption.id,
        isUnlimitedRefill: item.comboSlotOption.isUnlimitedRefill,
      }
    : null,
  chefNotes: item.chefNotes,
  seatLabel: item.seatLabel,
  fulfillmentType: item.fulfillmentType,
  stationId: item.stationId,
  menuChangeEventId: item.menuChangeEventId,
  resolutionAsOf: isoOrNull(item.resolutionAsOf),
  availabilitySnapshot: item.availabilitySnapshot ?? null,
  itemStatus: item.itemStatus,
  refiresOrderItemId: item.refiresOrderItemId,
  refireReason: item.refireReason,
  refireType: item.refireType,
  refiredBy: item.refiredBy,
  refiredAt: isoOrNull(item.refiredAt),
  voidedReason: item.voidedReason,
  voidedBy: item.voidedBy,
  voidedAt: isoOrNull(item.voidedAt),
  voidedReasonId: item.voidedReasonId,
  compedReason: item.compedReason,
  compedBy: item.compedBy,
  compedAt: isoOrNull(item.compedAt),
  compedReasonId: item.compedReasonId,
  station: item.station
    ? { id: item.station.id, name: item.station.name }
    : null,
  modifiers: item.modifiers.map((modifier) => ({
    modifierId: modifier.modifierId,
    modifierGroupName: modifier.modifierGroupName,
    name: modifier.name,
    price: Number(modifier.price),
    quantity: modifier.quantity,
    zoneLabel: modifier.zoneLabel,
  })),
  seatShares: item.seatShares.map((share) => ({
    id: share.id,
    seatLabel: share.seatLabel,
    shareRatio: Number(share.shareRatio),
  })),
  createdAt: item.createdAt.toISOString(),
});

const toKitchenTicketResponse = (
  ticket: KitchenTicketAggregate,
): OrderResponse["kitchenTickets"][number] => ({
  id: ticket.id,
  tenantId: ticket.tenantId,
  branchId: ticket.branchId,
  orderId: ticket.orderId,
  ticketNumber: ticket.ticketNumber,
  status: ticket.status,
  courseId: ticket.courseId,
  course: ticket.course
    ? {
        id: ticket.course.id,
        orderId: ticket.course.orderId,
        courseNumber: ticket.course.courseNumber,
        name: ticket.course.name,
        createdAt: ticket.course.createdAt.toISOString(),
        updatedAt: ticket.course.updatedAt.toISOString(),
      }
    : null,
  notes: ticket.notes,
  items: ticket.items.map(toOrderItemResponse),
  firedAt: isoOrNull(ticket.firedAt),
  readyAt: isoOrNull(ticket.readyAt),
  servedAt: isoOrNull(ticket.servedAt),
  createdAt: ticket.createdAt.toISOString(),
  updatedAt: ticket.updatedAt.toISOString(),
});

const toStatusHistoryResponse = (
  entry: StatusHistoryAggregate,
): OrderResponse["statusHistory"][number] => ({
  id: entry.id,
  orderId: entry.orderId,
  oldStatus: entry.oldStatus,
  newStatus: entry.newStatus,
  changedBy: entry.changedBy,
  reason: entry.reason,
  cancellationReasonId: entry.cancellationReasonId,
  cancellationReason: entry.cancellationReason
    ? {
        id: entry.cancellationReason.id,
        tenantId: entry.cancellationReason.tenantId,
        label: entry.cancellationReason.label,
        isActive: entry.cancellationReason.isActive,
        createdAt: entry.cancellationReason.createdAt.toISOString(),
        updatedAt: entry.cancellationReason.updatedAt.toISOString(),
      }
    : null,
  changedAt: entry.changedAt.toISOString(),
});

const toPaymentResponse = (
  payment: PaymentAggregate,
): OrderResponse["payments"][number] => ({
  id: payment.id,
  orderId: payment.orderId,
  billId: payment.billId,
  method: payment.method,
  status: payment.status,
  amount: Number(payment.amount),
  reference: payment.reference,
  metadata: parseMetadata(payment.metadata),
  createdAt: payment.createdAt.toISOString(),
});

export const toOrderResponse = (
  order: OrderAggregate | null | undefined,
): OrderResponse => {
  if (!order) throw new InternalError("Order response could not be loaded");
  return {
    id: order.id,
    mergedIntoOrderId: order.mergedIntoOrderId,
    tenantId: order.tenantId,
    branchId: order.branchId,
    tableId: order.tableId,
    table: order.table
      ? {
          id: order.table.id,
          tenantId: order.table.tenantId,
          branchId: order.table.branchId,
          name: order.table.name,
          capacity: order.table.capacity,
          status: order.table.status,
          section: order.table.section,
        }
      : null,
    customerId: order.customerId,
    customerGroupId: order.customerGroupId,
    status: order.status,
    type: order.type,
    billingMode: order.billingMode,
    coverCount: order.coverCount,
    perCoverPriceRuleId: order.perCoverPriceRuleId,
    perCoverRate: numberOrNull(order.perCoverRate),
    subtotal: Number(order.subtotal),
    taxAmount: Number(order.taxAmount),
    discountAmount: Number(order.discountAmount),
    serviceChargeAmount: Number(order.serviceChargeAmount),
    roundingAdjustment: Number(order.roundingAdjustment),
    totalAmount: Number(order.totalAmount),
    notes: order.notes,
    resolutionAsOf: isoOrNull(order.resolutionAsOf),
    items: order.items.map(toOrderItemResponse),
    kitchenTickets: order.kitchenTickets.map(toKitchenTicketResponse),
    statusHistory: order.statusHistory.map(toStatusHistoryResponse),
    payments: order.payments.map(toPaymentResponse),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
};

export const toOrderMergeResponse = (value: {
  source: OrderAggregate | null | undefined;
  target: OrderAggregate | null | undefined;
}): OrderMergeResponse => {
  if (!value.source || !value.target) {
    throw new InternalError("Order merge response is incomplete");
  }
  return {
    source: toOrderResponse(value.source),
    target: toOrderResponse(value.target),
  };
};

export const toOrderInventoryImpactResponse = (
  row: InventoryImpactAggregate,
): OrderInventoryImpactResponse => ({
  id: row.id,
  orderId: row.orderId,
  kitchenTicketId: row.kitchenTicketId,
  orderItemId: row.orderItemId,
  menuItemId: row.menuItemId,
  inventoryItemId: row.inventoryItemId,
  quantityDeducted: Number(row.quantityDeducted),
  unit: row.unit,
  wasShort: row.wasShort,
  deductedAt: row.deductedAt.toISOString(),
  reversedAt: isoOrNull(row.reversedAt),
  inventoryItem: {
    id: row.inventoryItem.id,
    name: row.inventoryItem.name,
  },
  menuItem: {
    id: row.menuItem.id,
    name: row.menuItem.name,
  },
});

export const toOrderListItemResponse = (
  order: OrderListAggregate,
): OrderListItemResponse => ({
  id: order.id,
  mergedIntoOrderId: order.mergedIntoOrderId,
  tenantId: order.tenantId,
  branchId: order.branchId,
  tableId: order.tableId,
  table: order.table
    ? {
        id: order.table.id,
        tenantId: order.table.tenantId,
        branchId: order.table.branchId,
        name: order.table.name,
        capacity: order.table.capacity,
        status: order.table.status,
        section: order.table.section,
      }
    : null,
  customerId: order.customerId,
  customerGroupId: order.customerGroupId,
  status: order.status,
  type: order.type,
  billingMode: order.billingMode,
  coverCount: order.coverCount,
  perCoverPriceRuleId: order.perCoverPriceRuleId,
  perCoverRate: numberOrNull(order.perCoverRate),
  subtotal: Number(order.subtotal),
  taxAmount: Number(order.taxAmount),
  discountAmount: Number(order.discountAmount),
  serviceChargeAmount: Number(order.serviceChargeAmount),
  roundingAdjustment: Number(order.roundingAdjustment),
  totalAmount: Number(order.totalAmount),
  notes: order.notes,
  resolutionAsOf: isoOrNull(order.resolutionAsOf),
  items: order.items.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    menuItemId: item.menuItemId,
    menuItemName: item.menuItemName,
    variantId: item.variantId,
    variantName: item.variantName,
    quantity: item.quantity,
    billingExcluded: item.billingExcluded,
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
    taxRate: Number(item.taxRate),
    taxMode: item.taxMode,
    chefNotes: item.chefNotes,
    seatLabel: item.seatLabel,
    fulfillmentType: item.fulfillmentType,
    stationId: item.stationId,
    itemStatus: item.itemStatus,
    comboId: item.comboId,
    comboGroupId: item.comboGroupId,
    comboSlotOptionId: item.comboSlotOptionId,
    createdAt: item.createdAt.toISOString(),
  })),
  kitchenTickets: order.kitchenTickets.map((ticket) => ({
    id: ticket.id,
    status: ticket.status,
    ticketNumber: ticket.ticketNumber,
  })),
  payments: order.payments.map(toPaymentResponse),
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});
