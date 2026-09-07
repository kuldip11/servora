import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { Button, Input, Select } from "@pos/ui";
import type { MenuItem } from "@pos/types";
import type { MenuItemFormValues } from "@pos/validation";
import { MenuMembershipsEditor } from "./forms/MenuMembershipsEditor";
import { ItemMediaVariantsSection } from "./forms/ItemMediaVariantsSection";
import { ItemAssociationsSection } from "./forms/ItemAssociationsSection";
import { StationRoutingEditor } from "./forms/StationRoutingEditor";
import { RecipeBuilder } from "./RecipeBuilder";
import { ScheduleManager } from "./ScheduleManager";
import { BranchOverridesPanel } from "./BranchOverridesPanel";
import { ChannelOverridesPanel } from "./ChannelOverridesPanel";
import { PriceRulesPanel } from "./PriceRulesPanel";
import { VariantAvailabilityPanel } from "./VariantAvailabilityPanel";
import { VariantModifierPricingPanel } from "./VariantModifierPricingPanel";
import type { useItemFormWorkflow } from "@/features/menu/hooks/useItemFormWorkflow";
import type { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import type { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import type { useMenuAllergens } from "@/features/menu/hooks/useMenuAllergens";
import type { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";

type Workflow = ReturnType<typeof useItemFormWorkflow>;
type Groups = NonNullable<ReturnType<typeof useModifierGroups>["data"]>;
type Tags = NonNullable<ReturnType<typeof useMenuTags>["data"]>;
type Allergens = NonNullable<ReturnType<typeof useMenuAllergens>["data"]>;
type Categories = NonNullable<ReturnType<typeof useMenuCategories>["data"]>;

interface Props {
  item: MenuItem | null;
  form: MenuItemFormValues;
  errors: FieldErrors<MenuItemFormValues>;
  register: UseFormRegister<MenuItemFormValues>;
  setValue: UseFormSetValue<MenuItemFormValues>;
  workflow: Workflow;
  groups: Groups;
  tags: Tags;
  allergens: Allergens;
  categories: Categories;
}

export const ItemAdvancedOptions = ({
  item,
  form,
  errors,
  register,
  setValue,
  workflow,
  groups,
  tags,
  allergens,
  categories,
}: Props) => {
  const {
    variants,
    imageUrls,
    newImageUrl,
    displayMode,
    effectiveFrom,
    pricingMode,
    weightUnit,
    openPriceMin,
    openPriceMax,
    supportsZones,
    zonePricingRule,
    trackByCount,
    manualStockCount,
    selectedGroupIds,
    selectedTagIds,
    selectedAllergenIds,
    setVariants,
    setImageUrls,
    setNewImageUrl,
    setDisplayMode,
    setEffectiveFrom,
    setPricingMode,
    setWeightUnit,
    setOpenPriceMin,
    setOpenPriceMax,
    setSupportsZones,
    setZonePricingRule,
    setTrackByCount,
    setManualStockCount,
    setSelectedGroupIds,
    setSelectedTagIds,
    setSelectedAllergenIds,
  } = workflow;
  const isEdit = !!item;
  const toggle = (
    id: string,
    list: string[],
    setList: (value: string[]) => void,
  ) =>
    setList(
      list.includes(id) ? list.filter((value) => value !== id) : [...list, id],
    );

  return (
    <div className="space-y-5 rounded-lg border border-border bg-surface-secondary/20 p-4">
      {item && <MenuMembershipsEditor item={item} categories={categories} />}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Pricing & stock
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Optional pricing modes, split-zone pricing, and finite stock
            tracking.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-text-primary">
            Pricing mode
            <select
              className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={pricingMode}
              onChange={(event) =>
                setPricingMode(event.target.value as typeof pricingMode)
              }
            >
              <option value="FIXED">Fixed price</option>
              <option value="WEIGHT_BASED">Weight based</option>
              <option value="OPEN">Open / manual price</option>
            </select>
          </label>
          {pricingMode === "WEIGHT_BASED" && (
            <label className="text-sm font-medium text-text-primary">
              Rate unit
              <select
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={weightUnit}
                onChange={(event) =>
                  setWeightUnit(event.target.value as typeof weightUnit)
                }
              >
                <option value="G">gram (g)</option>
                <option value="KG">kilogram (kg)</option>
                <option value="LB">pound (lb)</option>
                <option value="OZ">ounce (oz)</option>
              </select>
            </label>
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
            <label className="text-sm font-medium text-text-primary">
              Zone pricing rule
              <select
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={zonePricingRule}
                onChange={(event) =>
                  setZonePricingRule(
                    event.target.value as typeof zonePricingRule,
                  )
                }
              >
                <option value="HIGHER">Charge higher-priced zone</option>
                <option value="AVERAGE">Average zone modifier totals</option>
                <option value="SUM_HALF">Sum half of each zone</option>
              </select>
            </label>
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          label="SKU (optional)"
          placeholder="ITM-042"
          error={errors.sku?.message}
          {...register("sku")}
        />
        <Input
          label="Prep time (min)"
          type="number"
          min="0"
          placeholder="15"
          error={errors.prepTimeMinutes?.message}
          {...register("prepTimeMinutes")}
        />
        <Input
          label="HSN code"
          placeholder="996331"
          error={errors.hsnCode?.message}
          {...register("hsnCode")}
        />
      </div>
      <ItemMediaVariantsSection
        imageUrls={imageUrls}
        newImageUrl={newImageUrl}
        variants={variants}
        onNewImageUrl={setNewImageUrl}
        onAddImage={() => {
          if (newImageUrl.trim()) {
            setImageUrls((previous) => [...previous, newImageUrl.trim()]);
            setNewImageUrl("");
          }
        }}
        onRemoveImage={(index) =>
          setImageUrls((previous) =>
            previous.filter((_, currentIndex) => currentIndex !== index),
          )
        }
        onVariantChange={(index, patch) =>
          setVariants((previous) =>
            previous.map((variant, currentIndex) =>
              currentIndex === index ? { ...variant, ...patch } : variant,
            ),
          )
        }
        onRemoveVariant={(index) =>
          setVariants((previous) =>
            previous.filter((_, currentIndex) => currentIndex !== index),
          )
        }
        onAddVariant={() =>
          setVariants((previous) => [
            ...previous,
            { clientKey: crypto.randomUUID(), name: "", price: "0" },
          ])
        }
      />
      <div className="rounded border border-border p-3 space-y-2">
        <Select
          label="Ordering experience"
          value={displayMode}
          options={[
            { value: "STANDARD", label: "Standard item" },
            { value: "GUIDED_BUILDER", label: "Guided build-your-own" },
          ]}
          onChange={(event) =>
            setDisplayMode(event.target.value as "STANDARD" | "GUIDED_BUILDER")
          }
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setDisplayMode("GUIDED_BUILDER");
            setSelectedGroupIds(
              groups
                .filter((group) => group.minSelections > 0)
                .map((group) => group.id),
            );
          }}
        >
          Apply Build-Your-Own preset
        </Button>
        <Input
          label="Effective from (optional)"
          type="datetime-local"
          value={effectiveFrom}
          onChange={(event) => setEffectiveFrom(event.target.value)}
        />
        {effectiveFrom && new Date(effectiveFrom) > new Date() && (
          <p className="text-xs text-warning">
            Pending publish · live {new Date(effectiveFrom).toLocaleString()}
          </p>
        )}
      </div>
      <ItemAssociationsSection
        groups={groups}
        tags={tags}
        allergens={allergens}
        selectedGroupIds={selectedGroupIds}
        selectedTagIds={selectedTagIds}
        selectedAllergenIds={selectedAllergenIds}
        toggle={(id, list) => {
          if (list === "groups")
            toggle(id, selectedGroupIds, setSelectedGroupIds);
          else if (list === "tags")
            toggle(id, selectedTagIds, setSelectedTagIds);
          else toggle(id, selectedAllergenIds, setSelectedAllergenIds);
        }}
      />
      <div>
        <label className="flex items-center gap-2 text-sm text-text-secondary mb-2">
          <input
            type="checkbox"
            checked={form.enableRecipeDeduction}
            onChange={(event) =>
              setValue("enableRecipeDeduction", event.target.checked, {
                shouldValidate: true,
              })
            }
          />
          Auto-manage availability from inventory
        </label>
        {isEdit ? (
          form.enableRecipeDeduction && <RecipeBuilder item={item} />
        ) : (
          <p className="text-xs text-text-disabled">
            Save the item first, then edit it to link ingredients.
          </p>
        )}
      </div>
      {isEdit && (
        <div className="space-y-5">
          <ScheduleManager itemId={item.id} />
          <ChannelOverridesPanel itemId={item.id} />
          <VariantAvailabilityPanel
            itemId={item.id}
            variants={item.variants ?? []}
          />
          <VariantModifierPricingPanel
            variants={item.variants ?? []}
            groups={groups.filter((group) =>
              selectedGroupIds.includes(group.id),
            )}
          />
          <PriceRulesPanel itemId={item.id} branchId={item.branchId} />
        </div>
      )}
      {isEdit && item.branchId === null && (
        <BranchOverridesPanel
          itemId={item.id}
          basePrice={item.basePrice}
          baseTaxRate={item.taxRate}
          basePrepTimeMinutes={item.prepTimeMinutes}
        />
      )}
      {isEdit && (
        <StationRoutingEditor
          itemId={item.id}
          groups={groups.filter((group) => selectedGroupIds.includes(group.id))}
        />
      )}
    </div>
  );
};
