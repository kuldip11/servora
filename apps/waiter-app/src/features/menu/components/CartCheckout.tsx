import { Send } from "lucide-react";
import { Button, TextInput } from "@pos/ui";
import type { CartCheckout as Checkout, CartState } from "./cart-summary.types";

export const CartCheckout = ({
  checkout,
  state,
  notesPlaceholder,
  submitLabel,
  needsTable = false,
}: {
  checkout: Checkout;
  state: CartState;
  notesPlaceholder: string;
  submitLabel: string;
  needsTable?: boolean | undefined;
}) => {
  const {
    notes: orderNotes,
    setNotes: onOrderNotesChange,
    couponCode,
    setCouponCode: onCouponCodeChange,
    promotions,
    selectedPromotionIds,
    togglePromotion: onTogglePromotion,
    isPending,
    submit: onSubmit,
  } = checkout;
  const { totalItems, totalPrice } = state;
  return (
    <div className="w-full space-y-3">
      <TextInput
        placeholder={notesPlaceholder}
        value={orderNotes}
        onChange={(e) => onOrderNotesChange(e.target.value)}
        className="rounded-2xl bg-surface-secondary"
      />
      <TextInput
        placeholder="Coupon code (optional)"
        value={couponCode}
        onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
        className="rounded-2xl bg-surface-secondary"
      />
      {promotions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {promotions.map((promotion) => {
            const selected = selectedPromotionIds.includes(promotion.id);
            return (
              <button
                key={promotion.id}
                type="button"
                onClick={() => onTogglePromotion(promotion.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary"}`}
              >
                {promotion.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between py-1">
        <span className="text-sm text-text-secondary">
          Total ({totalItems} items)
        </span>
        <span className="text-xl font-bold text-text-primary">
          ₹{totalPrice.toFixed(2)}
        </span>
      </div>
      <Button
        onClick={onSubmit}
        disabled={needsTable}
        loading={isPending}
        className="w-full rounded-2xl py-4"
      >
        <Send className="w-4 h-4" />
        {isPending ? "Placing…" : submitLabel}
      </Button>
      {needsTable && (
        <p className="text-xs text-danger text-center -mt-1">
          Select a table to place a dine-in order.
        </p>
      )}
    </div>
  );
};
