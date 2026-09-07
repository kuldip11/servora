import { Tag } from "lucide-react";
import { TextInput } from "@pos/ui";

type CartRewardsSectionProps = {
  isOpen: boolean;
  onOpen: () => void;
  couponCode: string;
  onCouponCodeChange: (value: string) => void;
  loyaltyPhone: string;
  onLoyaltyPhoneChange: (value: string) => void;
};

export const CartRewardsSection = ({
  isOpen,
  onOpen,
  couponCode,
  onCouponCodeChange,
  loyaltyPhone,
  onLoyaltyPhoneChange,
}: CartRewardsSectionProps) => (
  <section className="mt-2">
    {!isOpen ? (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center justify-between rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-4 text-left text-xs text-text-secondary"
      >
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4" /> Add coupon or loyalty reward
        </span>
        <span className="font-extrabold text-primary">Add →</span>
      </button>
    ) : (
      <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 sm:grid-cols-2">
        <TextInput
          label="Coupon code"
          placeholder="Enter a code"
          value={couponCode}
          onChange={(event) =>
            onCouponCodeChange(event.target.value.toUpperCase())
          }
        />
        <TextInput
          label="Loyalty phone"
          placeholder="Enter your phone number"
          inputMode="tel"
          value={loyaltyPhone}
          onChange={(event) => onLoyaltyPhoneChange(event.target.value)}
        />
        <p className="text-[11px] leading-5 text-text-secondary sm:col-span-2">
          Promotions and loyalty pricing are confirmed when your order is
          submitted.
        </p>
      </div>
    )}
  </section>
);
