import { Clock3 } from "lucide-react";
import { formatMoney } from "@/shared/utils/money";

type CartTotalsSectionProps = {
  subtotal: number;
  tax: number;
  total: number;
  mode: "DINE_IN" | "TAKEAWAY";
};

export const CartTotalsSection = ({
  subtotal,
  tax,
  total,
  mode,
}: CartTotalsSectionProps) => (
  <>
    <section className="mt-6 border-t border-border pt-4">
      <div className="flex justify-between py-1.5 text-sm text-text-secondary">
        <span>Subtotal</span>
        <span>{formatMoney(subtotal)}</span>
      </div>
      <div className="flex justify-between py-1.5 text-sm text-text-secondary">
        <span>Taxes</span>
        <span>{formatMoney(tax)}</span>
      </div>
      <div className="mt-2 flex justify-between py-2 text-xl font-bold">
        <span>Total</span>
        <span>{formatMoney(total)}</span>
      </div>
    </section>

    <section className="mt-5 flex items-start gap-3 rounded-2xl bg-primary-surface p-4">
      <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-sm font-bold text-text-primary">
          {mode === "DINE_IN" ? "Pay after dining" : "Payment required"}
        </p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          {mode === "DINE_IN"
            ? "This round goes directly to the kitchen and stays on your table tab."
            : "You'll complete online payment before this order is sent to the kitchen."}
        </p>
      </div>
    </section>
  </>
);
