import { Badge } from "@pos/ui";

import type { CustomerMenuItem } from "@/api";
import { formatMoney } from "@/shared/utils/money";

type Props = {
  item: CustomerMenuItem;
  variantId?: string | undefined;
  onVariantChange: (variantId: string | undefined) => void;
};

export const ItemCustomizationOverview = ({
  item,
  variantId,
  onVariantChange,
}: Props) => {
  const staffPriced =
    item.pricingMode === "WEIGHT_BASED" || item.pricingMode === "OPEN";

  return (
    <>
      {item.imageUrl || item.images[0]?.url ? (
        <img
          src={item.imageUrl ?? item.images[0]?.url}
          alt={item.name}
          className="h-52 w-full rounded-3xl object-cover sm:h-64"
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="customer-display text-3xl font-bold text-text-primary">
              {item.name}
            </h2>
            {item.description && (
              <p className="mt-1 text-sm leading-6 text-text-secondary">
                {item.description}
              </p>
            )}
          </div>
          <span className="shrink-0 font-bold text-text-primary">
            {item.pricingMode === "OPEN"
              ? "Staff priced"
              : item.pricingMode === "WEIGHT_BASED"
                ? `${formatMoney(Number(item.basePrice))}/${String(item.weightUnit ?? "unit").toLowerCase()}`
                : formatMoney(Number(item.basePrice))}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant={
              item.foodType === "VEG"
                ? "success"
                : item.foodType === "EGG"
                  ? "warning"
                  : "danger"
            }
          >
            {item.foodType === "VEG"
              ? "Vegetarian"
              : item.foodType === "EGG"
                ? "Contains egg"
                : "Non-vegetarian"}
          </Badge>
          {item.spiceLevel && item.spiceLevel !== "NONE" && (
            <Badge>{item.spiceLevel.toLowerCase()} spice</Badge>
          )}
        </div>
      </div>

      {item.variants.length > 0 && (
        <fieldset>
          <div className="mb-3 flex items-center justify-between gap-3">
            <legend className="font-bold text-text-primary">
              Choose a size
            </legend>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#d45d24]">
              Required
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface px-4">
            {item.variants.map((variant) => {
              const active =
                (variant.manualOverrideStatus ?? variant.status ?? "ACTIVE") ===
                "ACTIVE";
              return (
                <label
                  key={variant.id}
                  className={`flex min-h-14 items-center justify-between border-b border-border py-3 last:border-b-0 ${active ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name={`variant-${item.id}`}
                      checked={variantId === variant.id}
                      disabled={!active}
                      onChange={() => onVariantChange(variant.id)}
                    />
                    <span className="font-medium text-text-primary">
                      {variant.name}
                      {active ? "" : " — unavailable"}
                    </span>
                  </span>
                  <span className="text-sm text-text-secondary">
                    {formatMoney(Number(variant.price))}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {staffPriced && (
        <p className="rounded-lg border border-warning/20 bg-warning-surface p-3 text-sm text-warning">
          {item.pricingMode === "WEIGHT_BASED"
            ? `Sold by weight (${item.weightUnit ?? "configured unit"}).`
            : "Price is entered by staff for this item."}{" "}
          Please ask a staff member to add it to your order.
        </p>
      )}
    </>
  );
};
