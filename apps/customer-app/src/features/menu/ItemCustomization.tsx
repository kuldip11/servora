import { memo, useState } from "react";
import { BottomSheet } from "@pos/ui";

import type { CustomerMenuItem } from "@/api";
import { validateItemConfiguration } from "@/features/cart/configuration";
import type { SelectedOption } from "@/features/cart/pricing";
import { getLineSubtotal } from "@/features/cart/pricing";
import { ItemCustomizationFooter } from "@/features/menu/ItemCustomizationFooter";
import { ItemCustomizationOverview } from "@/features/menu/ItemCustomizationOverview";
import { ItemModifierGroups } from "@/features/menu/ItemModifierGroups";

type Zone = "LEFT" | "RIGHT" | "WHOLE";

type Props = {
  item: CustomerMenuItem;
  selectedOptions: SelectedOption[];
  variantId?: string;
  onVariantChange: (variantId: string | undefined) => void;
  onToggle: (optionId: string, groupId: string, zoneLabel?: Zone) => void;
  onOptionQuantity: (optionId: string, delta: number, zoneLabel?: Zone) => void;
  onClose: () => void;
  onAdd: () => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  editing?: boolean;
};

export const ItemCustomization = memo(function ItemCustomization({
  item,
  selectedOptions,
  variantId,
  onVariantChange,
  onToggle,
  onOptionQuantity,
  onClose,
  onAdd,
  quantity,
  onQuantityChange,
  editing = false,
}: Props) {
  const [activeZone, setActiveZone] = useState<Zone>("LEFT");
  const validationError = validateItemConfiguration(
    item,
    variantId,
    selectedOptions,
  );
  const configuredTotal = getLineSubtotal({
    item,
    quantity,
    ...(variantId ? { variantId } : {}),
    selectedOptions,
    fulfillmentType: "DINE_IN",
  });

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={editing ? "Edit choices" : "Customize"}
      description="Customize this menu item before adding it to your order."
      maxHeight="94vh"
      contentClassName="customer-sheet sm:left-1/2 sm:right-auto sm:w-full sm:max-w-2xl sm:-translate-x-1/2"
      bodyClassName="customer-scrollbar-hidden px-4 pb-6 sm:px-7"
      footerClassName="bg-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-7"
      footer={
        <ItemCustomizationFooter
          editing={editing}
          quantity={quantity}
          total={configuredTotal}
          valid={validationError === null}
          onAdd={onAdd}
          onQuantityChange={onQuantityChange}
        />
      }
    >
      <div className="space-y-7">
        <ItemCustomizationOverview
          item={item}
          variantId={variantId}
          onVariantChange={onVariantChange}
        />
        <ItemModifierGroups
          item={item}
          selectedOptions={selectedOptions}
          variantId={variantId}
          activeZone={activeZone}
          onZoneChange={setActiveZone}
          onToggle={onToggle}
          onOptionQuantity={onOptionQuantity}
        />
        {validationError && (
          <p role="alert" className="text-sm text-danger">
            {validationError}
          </p>
        )}
      </div>
    </BottomSheet>
  );
});
