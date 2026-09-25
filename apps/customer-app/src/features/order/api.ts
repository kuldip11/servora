import { request } from "@/shared/api/client";

export type CustomerOrder = {
  id: string;
  status: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  serviceChargeAmount: string;
  roundingAdjustment: string;
  totalAmount: string;
  createdAt: string;
  items: Array<{
    id: string;
    menuItemId: string | null;
    menuItemName: string;
    comboId?: string | null;
    comboGroupId?: string | null;
    variantId: string | null;
    variantName: string | null;
    quantity: number;
    unitPrice: string | number;
    subtotal: string | number;
    taxRate?: string | number;
    taxMode?: "INCLUSIVE" | "EXCLUSIVE";
    chefNotes: string | null;
    fulfillmentType: "DINE_IN" | "TAKEAWAY";
    modifiers: Array<{
      modifierId: string;
      modifierGroupName: string | null;
      name: string;
      price: string | number;
      quantity: number;
    }>;
  }>;
  kitchenTickets: Array<{
    id: string;
    ticketNumber: number;
    status: "PENDING_PAYMENT" | "FIRED" | "PREPARING" | "READY" | "SERVED";
  }>;
  payments: Array<{
    id: string;
    method: "CASH" | "CARD" | "UPI" | "RAZORPAY" | "STRIPE";
    status: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
    amount: string;
    reference: string | null;
  }>;
};

export type CreateCustomerOrderInput = {
  fulfillmentType?: "DINE_IN" | "TAKEAWAY";
  items?: Array<{
    menuItemId: string;
    variantId?: string;
    quantity: number;
    chefNotes?: string;
    fulfillmentType?: "DINE_IN" | "TAKEAWAY";
    selectedOptions?: Array<{
      optionId: string;
      quantity?: number;
      zoneLabel?: "LEFT" | "RIGHT" | "WHOLE";
    }>;
  }>;
  combos?: Array<{
    comboId: string;
    quantity?: number;
    selections: Array<{ slotId: string; optionIds: string[] }>;
  }>;
  notes?: string;
  couponCode?: string;
  loyaltyPhone?: string;
};

export const createCustomerOrder = (
  sessionToken: string,
  input: CreateCustomerOrderInput,
) => {
  const requestId = crypto.randomUUID();
  return request<CustomerOrder>(
    "/api/customer/orders",
    {
      method: "POST",
      headers: { "X-Customer-Request-ID": requestId },
      body: JSON.stringify(input),
    },
    sessionToken,
  );
};

export const getCustomerOrder = (
  sessionToken: string,
  orderId: string,
  signal?: AbortSignal,
) => {
  return request<CustomerOrder>(
    `/api/customer/orders/${orderId}`,
    signal ? { signal } : undefined,
    sessionToken,
  );
};

export type CustomerCheckout = {
  payment: {
    id: string;
    method: "CASH";
    status: "PENDING";
    amount: string;
    reference: string | null;
  };
  orderStatus: string;
  paymentRequired: boolean;
  method: "CASH";
};

export const checkoutCustomerOrder = (
  sessionToken: string,
  orderId: string,
) => {
  return request<CustomerCheckout>(
    `/api/customer/orders/${orderId}/checkout`,
    {
      method: "POST",
      body: JSON.stringify({ method: "CASH" }),
    },
    sessionToken,
  );
};

export type TakeawayPaymentVerification = {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export const verifyTakeawayPayment = (
  sessionToken: string,
  input: TakeawayPaymentVerification,
) => {
  return request<CustomerOrder>(
    `/api/customer/orders/${input.orderId}/payment/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
      }),
    },
    sessionToken,
  );
};

export const initiateTakeawayPayment = (
  sessionToken: string,
  orderId: string,
) => {
  return request<{
    id: string;
    amount: string;
    reference: string | null;
    gatewayOrderId: string | null;
  }>(
    `/api/customer/orders/${orderId}/payment/initiate`,
    { method: "POST" },
    sessionToken,
  );
};
