import type { RestaurantTable } from "./common";
import type { InventoryItem } from "./inventory";
import type { KitchenTicket, Order } from "./orders";

export type RealtimeEvent =
  | {
      type: "order.created";
      payload: Order;
    }
  | {
      type: "order.updated";
      payload: Order;
    }
  | {
      type: "order.item.voided";
      payload: KitchenTicket;
    }
  | {
      type: "kitchen.ticket.created";
      payload: KitchenTicket & { customerSessionId?: string };
    }
  | {
      type: "kitchen.ticket.updated";
      payload: KitchenTicket & { customerSessionId?: string };
    }
  | {
      type: "inventory.low_stock";
      payload: InventoryItem;
    }
  | {
      type: "menu.availability.updated";
      payload: {
        source: "INVENTORY" | "MANUAL_STOCK_COUNT";
        entityType: "ITEM" | "VARIANT" | "MODIFIER_OPTION";
        entityId: string;
        menuItemId: string;
        computedStatus?: "ACTIVE" | "OUT_OF_STOCK";
        effectiveStatus?: string;
        computedAvailability?: boolean;
        effectiveAvailability?: boolean;
        manualStockCount?: number | null;
        reason?: string | null;
      };
    }
  | {
      type: "payment.updated";
      payload: {
        paymentId: string;
        orderId: string;
        status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
        amount: number;
      };
    }
  | {
      type: "table.updated";
      payload: RestaurantTable;
    }
  | {
      type: "customer.request.created";
      payload: CustomerRequest;
    }
  | {
      type: "customer.request.updated";
      payload: CustomerRequest;
    };

export type CustomerRequestType =
  "CALL_WAITER" | "WATER" | "CUTLERY" | "BILL" | "ASSISTANCE";
export type CustomerRequestStatus =
  "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "CANCELLED";
export interface CustomerRequest {
  id: string;
  tenantId: string;
  branchId: string;
  tableId: string;
  customerSessionId: string;
  orderId: string | null;
  type: CustomerRequestType;
  status: CustomerRequestStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
