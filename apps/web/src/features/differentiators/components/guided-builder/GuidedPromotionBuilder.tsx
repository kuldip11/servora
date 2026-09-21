import { Button, Card, Select } from "@pos/ui";
import { DIFFERENTIATORS_INPUT_CLASS } from "@/features/differentiators/constants";
import type { MenuChoice, PromotionType } from "./types";

type Preview = {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
};

type Props = {
  busy: boolean;
  promotionName: string;
  promotionType: PromotionType;
  promotionValue: string;
  promotionCoupon: string;
  promotionPreviewItemId: string;
  promotionPreview: Preview | null;
  menuChoices: MenuChoice[];
  ready: boolean;
  onNameChange: (value: string) => void;
  onTypeChange: (value: PromotionType) => void;
  onValueChange: (value: string) => void;
  onCouponChange: (value: string) => void;
  onPreviewItemChange: (value: string) => void;
  onPreview: () => void;
  onCreate: () => void;
};

const DISCOUNT_TYPE_OPTIONS = [
  { value: "PERCENTAGE", label: "Percentage" },
  { value: "FIXED_AMOUNT", label: "Fixed amount" },
];

export const GuidedPromotionBuilder = ({
  busy,
  promotionName,
  promotionType,
  promotionValue,
  promotionCoupon,
  promotionPreviewItemId,
  promotionPreview,
  menuChoices,
  ready,
  onNameChange,
  onTypeChange,
  onValueChange,
  onCouponChange,
  onPreviewItemChange,
  onPreview,
  onCreate,
}: Props) => (
  <Card>
    <h2 className="font-semibold">Guided promotion builder</h2>
    <p className="mt-1 text-sm text-text-secondary">
      Common order-level promotions are created here; advanced
      item/category/BOGO targeting remains in the full promotion editor.
    </p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <label className="text-sm font-medium text-text-primary">
        Promotion name
        <input
          className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
          value={promotionName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Weekday special"
        />
      </label>
      <Select
        label="Discount type"
        value={promotionType}
        onChange={(value) => onTypeChange(value as PromotionType)}
        options={DISCOUNT_TYPE_OPTIONS}
      />
      <label className="text-sm font-medium text-text-primary">
        {promotionType === "PERCENTAGE" ? "Percent off" : "Amount off"}
        <input
          className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
          type="number"
          min="0.01"
          max={promotionType === "PERCENTAGE" ? "100" : undefined}
          step="0.01"
          value={promotionValue}
          onChange={(event) => onValueChange(event.target.value)}
        />
      </label>
      <label className="text-sm font-medium text-text-primary">
        Coupon code (optional)
        <input
          className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
          value={promotionCoupon}
          onChange={(event) => onCouponChange(event.target.value.toUpperCase())}
          placeholder="LUNCH10"
        />
      </label>
      <Select
        label="Preview against menu item"
        value={promotionPreviewItemId}
        onChange={onPreviewItemChange}
        containerClassName="md:col-span-2"
        options={[
          { value: "", label: "Choose an item" },
          ...menuChoices.map((choice) => ({
            value: choice.id,
            label: `${choice.categoryName} — ${choice.name}`,
          })),
        ]}
      />
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        loading={busy}
        disabled={!ready}
        onClick={onPreview}
      >
        Preview authoritative discount
      </Button>
      <Button
        loading={busy}
        disabled={!ready || promotionPreview === null}
        onClick={onCreate}
      >
        Create promotion
      </Button>
      {promotionPreview ? (
        <strong>
          Sample: ₹{promotionPreview.subtotal.toFixed(2)} − ₹
          {promotionPreview.discountAmount.toFixed(2)} → ₹
          {promotionPreview.totalAmount.toFixed(2)}
        </strong>
      ) : null}
    </div>
  </Card>
);
