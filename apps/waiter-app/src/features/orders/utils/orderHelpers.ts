import type { OrderDto as Order } from "@pos/api-client";

export const shortOrderId = (id: string): string => {
  return `#${id.slice(-6).toUpperCase()}`;
};

export const formatCurrency = (amount: number | string): string => {
  return `₹${parseFloat(String(amount)).toFixed(2)}`;
};

export const isOrderReady = (order: Order): boolean => {
  return order.kitchenTickets?.some((t) => t.status === "READY") ?? false;
};

export const isOrderActive = (order: Order): boolean => {
  return order.status === "OPEN" || order.status === "BILL_REQUESTED";
};
