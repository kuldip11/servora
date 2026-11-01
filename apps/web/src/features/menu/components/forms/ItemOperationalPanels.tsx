import type { MenuItem } from "@pos/types";
import type { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import { BranchOverridesPanel } from "../BranchOverridesPanel";
import { ChannelOverridesPanel } from "../ChannelOverridesPanel";
import { PriceRulesPanel } from "../PriceRulesPanel";
import { ScheduleManager } from "../ScheduleManager";
import { VariantAvailabilityPanel } from "../VariantAvailabilityPanel";
import { VariantModifierPricingPanel } from "../VariantModifierPricingPanel";
import { StationRoutingEditor } from "./StationRoutingEditor";

type Groups = NonNullable<ReturnType<typeof useModifierGroups>["data"]>;

export const ItemOperationalPanels = ({
  item,
  groups,
  selectedGroupIds,
}: {
  item: MenuItem | null;
  groups: Groups;
  selectedGroupIds: string[];
}) => {
  if (!item) return null;
  const selectedGroups = groups.filter((group) =>
    selectedGroupIds.includes(group.id),
  );

  return (
    <>
      <div className="space-y-5">
        <ScheduleManager itemId={item.id} />
        <ChannelOverridesPanel itemId={item.id} />
        <VariantAvailabilityPanel
          itemId={item.id}
          variants={item.variants ?? []}
        />
        <VariantModifierPricingPanel
          variants={item.variants ?? []}
          groups={selectedGroups}
        />
        <PriceRulesPanel itemId={item.id} branchId={item.branchId} />
      </div>
      {item.branchId === null && (
        <BranchOverridesPanel
          itemId={item.id}
          basePrice={item.basePrice}
          baseTaxRate={item.taxRate}
          basePrepTimeMinutes={item.prepTimeMinutes}
        />
      )}
      <StationRoutingEditor itemId={item.id} groups={selectedGroups} />
    </>
  );
};
