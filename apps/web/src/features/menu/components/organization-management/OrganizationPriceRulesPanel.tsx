import { Button, Input } from "@pos/ui";
import type { PriceRule } from "@pos/types";

type Props = {
  ruleSku: string;
  rulePrice: string;
  rules: PriceRule[];
  creating: boolean;
  onSkuChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

export const OrganizationPriceRulesPanel = ({
  ruleSku,
  rulePrice,
  rules,
  creating,
  onSkuChange,
  onPriceChange,
  onCreate,
  onDelete,
}: Props) => (
  <div className="space-y-3 rounded-lg border border-border p-4">
    <h3 className="text-sm font-semibold text-text-primary">
      Inherited SKU prices
    </h3>
    <div className="grid grid-cols-2 gap-2">
      <Input
        label="Menu item SKU"
        value={ruleSku}
        onChange={(event) => onSkuChange(event.target.value)}
      />
      <Input
        label="Price"
        type="number"
        min="0"
        step="0.01"
        value={rulePrice}
        onChange={(event) => onPriceChange(event.target.value)}
      />
    </div>
    <Button
      type="button"
      disabled={!ruleSku.trim() || !rulePrice}
      loading={creating}
      onClick={onCreate}
    >
      Create organization price
    </Button>
    {rules
      .filter((rule) => !rule.isPerCover)
      .map((rule) => (
        <div
          key={rule.id}
          className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-sm"
        >
          <span>
            {rule.menuItemSku ?? "General"} · ₹
            {Number(rule.price ?? 0).toFixed(2)}
          </span>
          <button
            type="button"
            className="text-danger"
            onClick={() => onDelete(rule.id)}
          >
            Remove
          </button>
        </div>
      ))}
  </div>
);
