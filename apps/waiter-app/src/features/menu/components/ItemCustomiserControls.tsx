import { Minus, Plus } from "lucide-react";
import type { OrderableMenuItem } from "@pos/types";

export const ItemCustomiserControls = ({
  item,
  quantity,
  onQuantity,
  weightQuantity,
  onWeightQuantity,
  manualPrice,
  onManualPrice,
  variantId,
  onVariant,
  zoned,
  activeZone,
  onZone,
}: {
  item: OrderableMenuItem;
  quantity: number;
  onQuantity: (value: number) => void;
  weightQuantity: string;
  onWeightQuantity: (value: string) => void;
  manualPrice: string;
  onManualPrice: (value: string) => void;
  variantId: string;
  onVariant: (value: string) => void;
  zoned: boolean;
  activeZone: "LEFT" | "RIGHT" | "WHOLE";
  onZone: (value: "LEFT" | "RIGHT" | "WHOLE") => void;
}) => (
  <>
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Quantity
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onQuantity(quantity - 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-xl font-bold">{quantity}</span>
        <button
          type="button"
          onClick={() => onQuantity(quantity + 1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
    {item.pricingMode === "WEIGHT_BASED" && (
      <label className="block text-sm font-medium text-text-primary">
        Weight ({item.weightUnit ?? "unit"})
        <input
          className="mt-1.5 w-full rounded-xl border border-border bg-surface-secondary px-3 py-2"
          type="number"
          min="0.001"
          step="0.001"
          value={weightQuantity}
          onChange={(e) => onWeightQuantity(e.target.value)}
          placeholder={`Enter weight in ${item.weightUnit ?? "configured unit"}`}
        />
      </label>
    )}
    {item.pricingMode === "OPEN" && (
      <label className="block text-sm font-medium text-text-primary">
        Manual price
        <input
          className="mt-1.5 w-full rounded-xl border border-border bg-surface-secondary px-3 py-2"
          type="number"
          min={item.openPriceMin ?? 0}
          max={item.openPriceMax ?? undefined}
          step="0.01"
          value={manualPrice}
          onChange={(e) => onManualPrice(e.target.value)}
          placeholder={`${item.openPriceMin != null ? `Min ₹${item.openPriceMin}` : "Enter price"}${item.openPriceMax != null ? ` · Max ₹${item.openPriceMax}` : ""}`}
        />
      </label>
    )}
    {item.variants?.length > 0 && (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Size / Variant
        </p>
        <div className="space-y-2">
          {item.variants.map((variant) => {
            const unavailable =
              (variant.manualOverrideStatus ?? variant.status ?? "ACTIVE") !==
                "ACTIVE" ||
              (variant.manualOverrideStatus !== "ACTIVE" &&
                variant.manualStockCount != null &&
                variant.manualStockCount <= 0);
            return (
              <button
                type="button"
                key={variant.id}
                disabled={unavailable}
                onClick={() => onVariant(variant.id)}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left ${variantId === variant.id ? "border-primary bg-primary-surface" : "border-border"} disabled:opacity-50`}
              >
                <span className="font-medium">
                  {variant.name}
                  {unavailable ? " — unavailable" : ""}
                </span>
                <span className="float-right text-sm text-text-secondary">
                  ₹{Number(variant.price).toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}
    {zoned && (
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Apply toppings to
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["LEFT", "RIGHT", "WHOLE"] as const).map((zone) => (
            <button
              type="button"
              key={zone}
              onClick={() => onZone(zone)}
              className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold ${activeZone === zone ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary"}`}
            >
              {zone === "WHOLE"
                ? "Whole item"
                : `${zone[0]}${zone.slice(1).toLowerCase()} half`}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          Left and right selections are priced together using{" "}
          {String(item.zonePricingRule ?? "HIGHER").toLowerCase()}.
        </p>
      </div>
    )}
  </>
);
