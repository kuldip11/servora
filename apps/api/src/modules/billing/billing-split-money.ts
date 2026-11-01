import { ValidationError } from "@/core/errors";

export const splitMoneyEvenly = (amount: number, ways: number): number[] => {
  if (!Number.isInteger(ways) || ways < 1)
    throw new ValidationError("Split count must be a positive integer", {
      reason: "INVALID_SPLIT_COUNT",
    });
  const sign = amount < 0 ? -1 : 1;
  const cents = Math.abs(Math.round(amount * 100));
  const base = Math.floor(cents / ways);
  const remainder = cents % ways;
  return Array.from({ length: ways }, (_, index) => {
    const signedCents = sign * (base + (index < remainder ? 1 : 0));
    return signedCents === 0 ? 0 : signedCents / 100;
  });
};

export const areAllBillsPaid = (
  bills: Array<{ id: string; totalAmount: string | number }>,
  paidByBill: ReadonlyMap<string, number>,
): boolean => {
  return bills.every(
    (bill) => (paidByBill.get(bill.id) ?? 0) >= Number(bill.totalAmount) - 0.01,
  );
};

export const combinedOrderAmounts = (
  orders: Array<{
    subtotal: string | number;
    taxAmount: string | number;
    discountAmount: string | number;
    serviceChargeAmount?: string | number;
    roundingAdjustment?: string | number;
    totalAmount: string | number;
  }>,
) => {
  const sum = (
    key:
      | "subtotal"
      | "taxAmount"
      | "discountAmount"
      | "serviceChargeAmount"
      | "roundingAdjustment"
      | "totalAmount",
  ) =>
    orders
      .reduce((total, order) => total + Number(order[key] ?? 0), 0)
      .toFixed(2);
  return {
    subtotal: sum("subtotal"),
    taxAmount: sum("taxAmount"),
    discountAmount: sum("discountAmount"),
    serviceChargeAmount: sum("serviceChargeAmount"),
    roundingAdjustment: sum("roundingAdjustment"),
    totalAmount: sum("totalAmount"),
  };
};
