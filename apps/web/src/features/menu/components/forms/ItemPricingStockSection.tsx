import { Input, Select } from "@pos/ui";
import type { useItemFormWorkflow } from "@/features/menu/hooks/useItemFormWorkflow";

type Workflow = ReturnType<typeof useItemFormWorkflow>;

export const ItemPricingStockSection = ({
  workflow,
}: {
  workflow: Workflow;
}) => {
  const {
    pricingMode,
    weightUnit,
    openPriceMin,
    openPriceMax,
    supportsZones,
    zonePricingRule,
    trackByCount,
    manualStockCount,
    setPricingMode,
    setWeightUnit,
    setOpenPriceMin,
    setOpenPriceMax,
    setSupportsZones,
    setZonePricingRule,
    setTrackByCount,
    setManualStockCount,
  } = workflow;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          Pricing & stock
        </h3>
        <p className="mt-0.5 text-xs text-text-secondary">
          Optional pricing modes, split-zone pricing, and finite stock tracking.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select
          label="Pricing mode"
          value={pricingMode}
          onChange={(value) => setPricingMode(value as typeof pricingMode)}
          options={[
            { value: "FIXED", label: "Fixed price" },
            { value: "WEIGHT_BASED", label: "Weight based" },
            { value: "OPEN", label: "Open / manual price" },
          ]}
        />
        {pricingMode === "WEIGHT_BASED" && (
          <Select
            label="Rate unit"
            value={weightUnit}
            onChange={(value) => setWeightUnit(value as typeof weightUnit)}
            options={[
              { value: "G", label: "gram (g)" },
              { value: "KG", label: "kilogram (kg)" },
              { value: "LB", label: "pound (lb)" },
              { value: "OZ", label: "ounce (oz)" },
            ]}
          />
        )}
        {pricingMode === "OPEN" && (
          <>
            <Input
              label="Minimum manual price"
              type="number"
              min="0"
              step="0.01"
              value={openPriceMin}
              onChange={(event) => setOpenPriceMin(event.target.value)}
            />
            <Input
              label="Maximum manual price"
              type="number"
              min="0"
              step="0.01"
              value={openPriceMax}
              onChange={(event) => setOpenPriceMax(event.target.value)}
            />
          </>
        )}
      </div>
      {pricingMode === "OPEN" &&
        openPriceMin !== "" &&
        openPriceMax !== "" &&
        Number(openPriceMin) > Number(openPriceMax) && (
          <p className="text-xs text-danger">
            Minimum manual price cannot exceed maximum.
          </p>
        )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <input
            type="checkbox"
            checked={supportsZones}
            onChange={(event) => setSupportsZones(event.target.checked)}
          />
          Supports split zones / half-and-half
        </label>
        {supportsZones && (
          <Select
            label="Zone pricing rule"
            value={zonePricingRule}
            onChange={(value) =>
              setZonePricingRule(value as typeof zonePricingRule)
            }
            options={[
              { value: "HIGHER", label: "Charge higher-priced zone" },
              { value: "AVERAGE", label: "Average zone modifier totals" },
              { value: "SUM_HALF", label: "Sum half of each zone" },
            ]}
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <input
            type="checkbox"
            checked={trackByCount}
            onChange={(event) => setTrackByCount(event.target.checked)}
          />
          Track finite stock by item count
        </label>
        {trackByCount && (
          <Input
            label="Current stock count"
            type="number"
            min="0"
            step="1"
            value={manualStockCount}
            onChange={(event) => setManualStockCount(event.target.value)}
          />
        )}
      </div>
    </section>
  );
};
