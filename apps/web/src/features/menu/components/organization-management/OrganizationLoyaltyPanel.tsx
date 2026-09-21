import { Button, Input, Select } from "@pos/ui";
import type { CustomerLoyaltyTier } from "@pos/types";

type LoyaltyMode = "PERCENT" | "FIXED";

type Props = {
  loyaltyName: string;
  loyaltyMode: LoyaltyMode;
  loyaltyValue: string;
  tiers: CustomerLoyaltyTier[];
  creating: boolean;
  onNameChange: (value: string) => void;
  onModeChange: (value: LoyaltyMode) => void;
  onValueChange: (value: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

const DISCOUNT_TYPE_OPTIONS = [
  { value: "PERCENT", label: "Percent" },
  { value: "FIXED", label: "Fixed amount" },
];

export const OrganizationLoyaltyPanel = ({
  loyaltyName,
  loyaltyMode,
  loyaltyValue,
  tiers,
  creating,
  onNameChange,
  onModeChange,
  onValueChange,
  onCreate,
  onDelete,
}: Props) => (
  <div className="space-y-3 rounded-lg border border-border p-4 xl:col-span-2">
    <h3 className="text-sm font-semibold text-text-primary">
      Organization loyalty tiers
    </h3>
    <p className="text-xs text-text-secondary">
      Customers linked by the shared organization identity receive these tiers
      at every sibling tenant. Tenant-local tiers remain local and take no
      schema migration.
    </p>
    <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
      <Input
        label="Tier name"
        value={loyaltyName}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <Select
        label="Discount type"
        value={loyaltyMode}
        onChange={(value) => onModeChange(value as LoyaltyMode)}
        options={DISCOUNT_TYPE_OPTIONS}
      />
      <Input
        label={loyaltyMode === "PERCENT" ? "Percent" : "Amount"}
        type="number"
        min="0.01"
        max={loyaltyMode === "PERCENT" ? "100" : undefined}
        step="0.01"
        value={loyaltyValue}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <Button
        type="button"
        disabled={
          !loyaltyName.trim() ||
          Number(loyaltyValue) <= 0 ||
          (loyaltyMode === "PERCENT" && Number(loyaltyValue) > 100)
        }
        loading={creating}
        onClick={onCreate}
      >
        Create tier
      </Button>
    </div>
    {tiers.map((tier) => (
      <div
        key={tier.id}
        className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-sm"
      >
        <span className="text-text-primary">
          {tier.name} ·{" "}
          {tier.discountPercent !== null
            ? `${Number(tier.discountPercent)}% off`
            : `₹${Number(tier.discountFixed ?? 0).toFixed(2)} off`}{" "}
          · organization-wide
        </span>
        <button
          type="button"
          className="text-danger"
          onClick={() => onDelete(tier.id)}
        >
          Remove
        </button>
      </div>
    ))}
  </div>
);
