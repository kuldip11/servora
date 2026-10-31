export type CustomerCheckoutInput = {
  orderId: string;
  billId?: string;
  method: "CASH";
};
