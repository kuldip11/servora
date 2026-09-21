import { formatCurrency } from "@/shared/utils/format";
import type { MenuItem } from "@pos/types";

type Props = {
  variants: MenuItem["variants"];
  selectedVariantId: string;
  onChange: (id: string) => void;
};

export const VariantSelector = ({
  variants,
  selectedVariantId,
  onChange,
}: Props) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
      Size / Variant
    </p>
    <div className="space-y-2">
      {variants.map((variant) => {
        const active =
          (variant.manualOverrideStatus ?? variant.status ?? "ACTIVE") ===
          "ACTIVE";
        const selected = selectedVariantId === variant.id;
        return (
          <button
            key={variant.id}
            disabled={!active}
            onClick={() => onChange(variant.id)}
            className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-2.5 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-primary bg-primary-surface" : "border-border"}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${selected ? "border-primary" : "border-text-disabled"}`}
              >
                {selected ? (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                ) : null}
              </div>
              <span className="text-sm font-medium text-text-primary">
                {variant.name}
                {!active ? " — 86'd" : ""}
              </span>
            </div>
            <span className="text-sm text-text-secondary">
              {formatCurrency(Number(variant.price))}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);
