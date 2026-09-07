import { Card } from "@pos/ui";
import type { Order } from "@pos/types";
import { formatCurrency } from "@/shared/utils/format";

export const OrderFinancialSummary = ({ order }: { order: Order }) => {
  const total = parseFloat(String(order.totalAmount));
  const hasInclusiveTax = order.items?.some(
    (item) => item.taxMode === "INCLUSIVE",
  );
  const hasExclusiveTax = order.items?.some(
    (item) => item.taxMode === "EXCLUSIVE",
  );

  return (
    <Card>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm text-text-secondary">
          <span>Subtotal</span>
          <span>{formatCurrency(parseFloat(String(order.subtotal)))}</span>
        </div>
        <div className="flex justify-between text-sm text-text-secondary">
          <span>
            {hasInclusiveTax
              ? hasExclusiveTax
                ? "Tax (mixed included/exclusive)"
                : "Tax included"
              : "Tax"}
          </span>
          <span>{formatCurrency(parseFloat(String(order.taxAmount)))}</span>
        </div>
        {parseFloat(String(order.serviceChargeAmount ?? 0)) > 0 && (
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Service charge</span>
            <span>
              {formatCurrency(parseFloat(String(order.serviceChargeAmount)))}
            </span>
          </div>
        )}
        {Math.abs(parseFloat(String(order.roundingAdjustment ?? 0))) >=
          0.005 && (
          <div className="flex justify-between text-sm text-text-secondary">
            <span>Rounding</span>
            <span>
              {formatCurrency(parseFloat(String(order.roundingAdjustment)))}
            </span>
          </div>
        )}
        {parseFloat(String(order.discountAmount)) > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>Discount</span>
            <span>
              -{formatCurrency(parseFloat(String(order.discountAmount)))}
            </span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-text-primary pt-2 border-t border-border">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  );
};
