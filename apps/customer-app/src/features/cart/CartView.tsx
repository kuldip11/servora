import { memo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  PackageCheck,
  ShoppingBag,
  Utensils,
} from "lucide-react";
import { Button, Dialog, EmptyState, IconButton } from "@pos/ui";
import type { CartLine } from "./pricing";
import type { ComboCartLine } from "./combo";
import { CartItemsSection } from "./components/CartItemsSection";
import { CartRewardsSection } from "./components/CartRewardsSection";
import { CartTotalsSection } from "./components/CartTotalsSection";

export const CartView = memo(function CartView({
  cart,
  combos,
  subtotal,
  tax,
  total,
  table,
  mode = "DINE_IN",
  onBack,
  onChange,
  onComboChange,
  onEdit,
  onPlace,
  couponCode,
  onCouponCodeChange,
  loyaltyPhone,
  onLoyaltyPhoneChange,
  loading,
}: {
  cart: CartLine[];
  combos: ComboCartLine[];
  subtotal: number;
  tax: number;
  total: number;
  table: string;
  mode?: "DINE_IN" | "TAKEAWAY";
  onBack: () => void;
  onChange: (index: number, delta: number) => void;
  onComboChange: (index: number, delta: number) => void;
  onEdit: (index: number) => void;
  onPlace: (fulfillmentType: "DINE_IN" | "TAKEAWAY") => void;
  couponCode: string;
  onCouponCodeChange: (value: string) => void;
  loyaltyPhone: string;
  onLoyaltyPhoneChange: (value: string) => void;
  loading: boolean;
}) {
  const [rewardsOpen, setRewardsOpen] = useState(
    Boolean(couponCode || loyaltyPhone),
  );
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const empty = cart.length === 0 && combos.length === 0;

  return (
    <div className="customer-experience fixed inset-0 z-40 overflow-y-auto overscroll-contain bg-background text-text-primary">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div className="flex items-center gap-3">
            <IconButton
              aria-label="Back to menu"
              icon={ArrowLeft}
              variant="secondary"
              size="lg"
              className="rounded-full"
              onClick={onBack}
            />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#d45d24]">
                Review
              </p>
              <h1 className="customer-display text-3xl font-bold">
                Your order
              </h1>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary-surface px-4 py-3 text-xs font-bold text-primary">
            <span className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              {mode === "DINE_IN"
                ? `Table ${table} · Dine in`
                : "Takeaway order"}
            </span>
            {!empty && (
              <span>
                {cart.reduce((sum, line) => sum + line.quantity, 0) +
                  combos.reduce((sum, line) => sum + line.quantity, 0)}{" "}
                items
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-44 sm:px-6">
        {empty ? (
          <div className="mt-10 rounded-3xl border border-border bg-surface py-10">
            <EmptyState
              icon={ShoppingBag}
              title="Your order is empty"
              description="Add something from the menu to continue."
              action={<Button onClick={onBack}>Browse menu</Button>}
            />
          </div>
        ) : (
          <>
            <CartItemsSection
              cart={cart}
              combos={combos}
              onChange={onChange}
              onComboChange={onComboChange}
              onEdit={onEdit}
            />

            <CartRewardsSection
              isOpen={rewardsOpen}
              onOpen={() => setRewardsOpen(true)}
              couponCode={couponCode}
              onCouponCodeChange={onCouponCodeChange}
              loyaltyPhone={loyaltyPhone}
              onLoyaltyPhoneChange={onLoyaltyPhoneChange}
            />

            <CartTotalsSection
              subtotal={subtotal}
              tax={tax}
              total={total}
              mode={mode}
            />
          </>
        )}
      </main>

      {!empty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto max-w-3xl">
            <p
              id="order-note"
              className="mb-2 text-center text-[10px] text-text-secondary"
            >
              {mode === "DINE_IN"
                ? "Choose dine-in or takeaway next · Your table tab stays open"
                : "Secure payment is completed before kitchen confirmation"}
            </p>
            <Button
              aria-describedby="order-note"
              disabled={loading}
              loading={loading}
              onClick={() =>
                mode === "DINE_IN"
                  ? setFulfillmentOpen(true)
                  : onPlace("TAKEAWAY")
              }
              size="lg"
              className="h-14 w-full rounded-2xl"
            >
              {mode === "TAKEAWAY" ? "Continue to payment" : "Place order"}{" "}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={fulfillmentOpen}
        onClose={() => setFulfillmentOpen(false)}
        title="How should we prepare this order?"
        description="Choose one preparation method for every item in this round."
        size="md"
        contentClassName="customer-dialog overflow-hidden rounded-[24px]"
        bodyClassName="p-0"
      >
        <div className="customer-experience space-y-3 bg-background p-5 text-text-primary sm:p-6">
          <p className="mb-4 text-sm leading-6 text-text-secondary">
            This choice applies to all items in this order. You can choose
            differently the next time you order.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setFulfillmentOpen(false);
              onPlace("DINE_IN");
            }}
            className="flex w-full items-start gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-primary hover:bg-primary-surface disabled:opacity-50"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Utensils className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-base">Dine in</strong>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">
                Serve everything normally at Table {table}.
              </span>
            </span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setFulfillmentOpen(false);
              onPlace("TAKEAWAY");
            }}
            className="flex w-full items-start gap-4 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-[#d45d24] hover:bg-[#fff1e8] disabled:opacity-50 dark:hover:bg-[#3a2419]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#d45d24] text-white">
              <PackageCheck className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-base">Pack for takeaway</strong>
              <span className="mt-1 block text-xs leading-5 text-text-secondary">
                Pack this round, deliver it to Table {table}, and keep it on the
                same table bill.
              </span>
            </span>
          </button>
          <p className="pt-1 text-center text-[11px] leading-5 text-text-secondary">
            Your table remains open until you request the bill.
          </p>
        </div>
      </Dialog>
    </div>
  );
});
