import { useState } from "react";
import { Button, Input } from "@pos/ui";
import type { MenuItemVariant } from "@pos/types";
import {
  useSetVariantStockCount,
  useUpdateVariantAvailability,
} from "@/features/menu/hooks/useVariantAvailability";

export const VariantAvailabilityPanel = ({
  itemId,
  variants,
}: {
  itemId: string;
  variants: MenuItemVariant[];
}) => {
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      variants.map((variant) => [
        variant.id,
        variant.manualStockCount == null
          ? ""
          : String(variant.manualStockCount),
      ]),
    ),
  );
  const update = useUpdateVariantAvailability();
  const stock = useSetVariantStockCount(itemId);
  if (!variants.length) return null;
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-text-primary">
        Variant availability & count
      </span>
      {variants.map((variant) => {
        const unavailable =
          (variant.manualOverrideStatus ?? variant.status ?? "ACTIVE") !==
          "ACTIVE";
        const rawCount = counts[variant.id] ?? "";
        const currentCount =
          rawCount === ""
            ? null
            : Math.max(0, Number.parseInt(rawCount, 10) || 0);
        return (
          <div
            key={variant.id}
            className="rounded border border-border px-3 py-2 text-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span>
                {variant.name} ·{" "}
                {unavailable
                  ? (variant.manualOverrideReason ?? "Unavailable")
                  : "Active"}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={update.isPending}
                onClick={() =>
                  update.mutate({ id: variant.id, unavailable: !unavailable })
                }
              >
                {unavailable ? "Restore" : "86 variant"}
              </Button>
            </div>
            <div className="mt-2 flex items-end gap-2">
              <div className="w-36">
                <Input
                  label="Finite count"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Not tracked"
                  value={rawCount}
                  onChange={(event) =>
                    setCounts((current) => ({
                      ...current,
                      [variant.id]: event.target.value,
                    }))
                  }
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={stock.isPending}
                onClick={() =>
                  stock.mutate({ variantId: variant.id, count: currentCount })
                }
              >
                Set
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={stock.isPending}
                onClick={() => {
                  const next =
                    (currentCount ?? variant.manualStockCount ?? 0) + 1;
                  setCounts((current) => ({
                    ...current,
                    [variant.id]: String(next),
                  }));
                  stock.mutate({ variantId: variant.id, count: next });
                }}
              >
                +1
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={stock.isPending}
                onClick={() => {
                  const next =
                    (currentCount ?? variant.manualStockCount ?? 0) + 6;
                  setCounts((current) => ({
                    ...current,
                    [variant.id]: String(next),
                  }));
                  stock.mutate({ variantId: variant.id, count: next });
                }}
              >
                +6
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={stock.isPending}
                onClick={() => {
                  setCounts((current) => ({ ...current, [variant.id]: "" }));
                  stock.mutate({ variantId: variant.id, count: null });
                }}
              >
                Stop tracking
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
