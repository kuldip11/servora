import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Modal, Input, Select } from "@pos/ui";
import { FoodTypeDot } from "./FoodTypeDot";
import {
  MENU_FOOD_TYPE_OPTIONS,
  MENU_ITEM_STATUS_OPTIONS,
  MENU_SPICE_LEVEL_OPTIONS,
} from "@/features/menu/constants";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import { useMenuAllergens } from "@/features/menu/hooks/useMenuAllergens";
import { useSaveMenuItem } from "@/features/menu/hooks/useSaveMenuItem";
import { useItemFormWorkflow } from "@/features/menu/hooks/useItemFormWorkflow";
import { ItemAdvancedOptions } from "./ItemAdvancedOptions";
import type {
  MenuItem,
  FoodType,
  SpiceLevel,
  MenuItemStatus,
} from "@pos/types";
import {
  advancedMenuItemPricingSchema,
  menuItemFormSchema,
  type MenuItemFormValues,
} from "@pos/validation";

interface Props {
  categoryId: string;
  item: MenuItem | null;
  onClose: () => void;
}

export const ItemFormModal = ({ categoryId, item, onClose }: Props) => {
  const isEdit = !!item;
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: item?.name ?? "",
      description: item?.description ?? "",
      basePrice: item ? String(item.basePrice) : "",
      manualCost: item?.manualCost != null ? String(item.manualCost) : "",
      taxRate: item ? String(item.taxRate) : "0",
      foodType: (item?.foodType ?? "VEG") as FoodType,
      spiceLevel: (item?.spiceLevel ?? "") as SpiceLevel | "",
      sku: item?.sku ?? "",
      prepTimeMinutes:
        item?.prepTimeMinutes != null ? String(item.prepTimeMinutes) : "",
      hsnCode: item?.hsnCode ?? "",
      status: (item?.status ?? "ACTIVE") as MenuItemStatus,
      availabilityReason: item?.availabilityReason ?? "",
      enableRecipeDeduction: item?.enableRecipeDeduction ?? true,
      variants:
        item?.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: String(v.price),
        })) ?? [],
      imageUrls: item?.images?.map((i) => i.url) ?? [],
      modifierGroupIds:
        item?.modifierGroupLinks?.map((l) => l.modifierGroupId) ?? [],
      tagIds: item?.tagLinks?.map((l) => l.tagId) ?? [],
      allergenIds: item?.allergenLinks?.map((l) => l.allergenId) ?? [],
    },
  });
  const form = watch();
  const workflow = useItemFormWorkflow(item);
  const {
    showAdvanced,
    variants,
    imageUrls,
    newImageUrl,
    displayMode,
    taxMode,
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
    setShowAdvanced,
    setVariants,
    setImageUrls,
    setNewImageUrl,
    setDisplayMode,
    setTaxMode,
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
  const { data: allGroups } = useModifierGroups();
  const { data: allTags } = useMenuTags();
  const { data: allAllergens } = useMenuAllergens();
  const { data: allCategories } = useMenuCategories();

  const saveMutation = useSaveMenuItem();

  function handleSave(values: MenuItemFormValues) {
    const parsed = menuItemFormSchema.safeParse({
      ...values,
      variants,
      imageUrls,
      modifierGroupIds: selectedGroupIds,
      tagIds: selectedTagIds,
      allergenIds: selectedAllergenIds,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as
          | "variants"
          | "imageUrls"
          | "modifierGroupIds"
          | "tagIds"
          | "allergenIds";
        if (field) setError(field, { message: issue.message });
      }
      return;
    }
    const advancedPricing = advancedMenuItemPricingSchema.safeParse({
      pricingMode,
      weightUnit: pricingMode === "WEIGHT_BASED" ? weightUnit : null,
      openPriceMin:
        pricingMode === "OPEN" && openPriceMin !== ""
          ? Number(openPriceMin)
          : null,
      openPriceMax:
        pricingMode === "OPEN" && openPriceMax !== ""
          ? Number(openPriceMax)
          : null,
      supportsZones,
      zonePricingRule,
      manualStockCount:
        trackByCount && manualStockCount !== ""
          ? Number(manualStockCount)
          : null,
    });
    if (!advancedPricing.success) {
      const message =
        advancedPricing.error.issues[0]?.message ??
        "Invalid advanced pricing configuration";
      setError("basePrice", { message });
      return;
    }
    const payload = {
      categoryId,
      name: values.name.trim(),
      description: values.description.trim() || null,
      basePrice: Number(values.basePrice),
      manualCost: values.manualCost === "" ? null : Number(values.manualCost),
      pricingMode,
      ...(pricingMode === "WEIGHT_BASED"
        ? { weightUnit }
        : isEdit
          ? { weightUnit: null }
          : {}),
      ...(pricingMode === "OPEN" && openPriceMin !== ""
        ? { openPriceMin: Number(openPriceMin) }
        : isEdit
          ? { openPriceMin: null }
          : {}),
      ...(pricingMode === "OPEN" && openPriceMax !== ""
        ? { openPriceMax: Number(openPriceMax) }
        : isEdit
          ? { openPriceMax: null }
          : {}),
      supportsZones,
      zonePricingRule,
      ...(trackByCount && manualStockCount !== ""
        ? { manualStockCount: Number(manualStockCount) }
        : isEdit
          ? { manualStockCount: null }
          : {}),
      taxRate: values.taxRate ? Number(values.taxRate) : 0,
      taxMode: taxMode || null,
      foodType: values.foodType,
      spiceLevel: values.spiceLevel || null,
      sku: values.sku.trim() || null,
      prepTimeMinutes:
        values.prepTimeMinutes === ""
          ? null
          : parseInt(values.prepTimeMinutes, 10),
      hsnCode: values.hsnCode.trim() || null,
      status: values.status,
      availabilityReason: values.availabilityReason.trim() || null,
      enableRecipeDeduction: values.enableRecipeDeduction,
      displayMode,
      effectiveFrom: effectiveFrom
        ? new Date(effectiveFrom).toISOString()
        : null,
      variants: variants
        .filter((v) => v.name.trim())
        .map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name,
          price: parseFloat(v.price) || 0,
        })),
      modifierGroupIds: selectedGroupIds,
      tagIds: selectedTagIds,
      allergenIds: selectedAllergenIds,
      imageUrls,
    };
    saveMutation.mutate({ item, payload }, { onSuccess: onClose });
  }

  return (
    <Modal
      open
      title={isEdit ? "Edit Menu Item" : "Add Menu Item"}
      onClose={onClose}
      size="xl"
    >
      <form
        className="space-y-5"
        noValidate
        onSubmit={handleSubmit(handleSave)}
      >
        <Input
          label="Item name"
          placeholder="Chicken Tikka"
          error={errors.name?.message}
          {...register("name")}
        />

        <div>
          <label
            htmlFor="item-description"
            className="text-sm font-medium text-text-primary"
          >
            Description <span className="text-text-disabled">(optional)</span>
          </label>
          <textarea
            id="item-description"
            placeholder="Short description shown to staff and customers"
            {...register("description")}
            aria-invalid={!!errors.description}
            rows={2}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Selling price (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            error={errors.basePrice?.message}
            {...register("basePrice")}
          />
          <Input
            label="Cost (₹)"
            type="number"
            min="0"
            step="0.01"
            placeholder="Not configured"
            error={errors.manualCost?.message}
            {...register("manualCost")}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            label="Tax rate (%)"
            type="number"
            min="0"
            max="100"
            step="0.5"
            placeholder="0"
            error={errors.taxRate?.message}
            {...register("taxRate")}
          />
          <Select
            label="Tax mode"
            value={taxMode}
            onChange={(event) =>
              setTaxMode(event.target.value as "" | "INCLUSIVE" | "EXCLUSIVE")
            }
            options={[
              { value: "", label: "Use franchise default" },
              { value: "EXCLUSIVE", label: "Tax added to price" },
              { value: "INCLUSIVE", label: "Tax included in price" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <span
              id="item-food-type-label"
              className="text-sm font-medium text-text-primary mb-1.5 block"
            >
              Food type
            </span>
            <div
              role="group"
              aria-labelledby="item-food-type-label"
              className="flex gap-2"
            >
              {MENU_FOOD_TYPE_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() =>
                    setValue("foodType", opt.value, { shouldValidate: true })
                  }
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md border text-xs font-medium transition-colors ${
                    form.foodType === opt.value
                      ? "border-primary bg-primary-surface text-primary"
                      : "border-border text-text-secondary"
                  }`}
                >
                  <FoodTypeDot type={opt.value} size="sm" /> {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Select
            label="Spice level"
            error={errors.spiceLevel?.message}
            {...register("spiceLevel")}
            options={MENU_SPICE_LEVEL_OPTIONS}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Select
            label="Status"
            error={errors.status?.message}
            {...register("status")}
            options={MENU_ITEM_STATUS_OPTIONS}
          />
          <Input
            label="Reason (optional)"
            placeholder="e.g. Out of stock till Monday"
            error={errors.availabilityReason?.message}
            {...register("availabilityReason")}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="text-sm font-medium text-primary hover:text-primary-hover"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "Hide advanced options" : "Show advanced options"}
        </button>

        {showAdvanced && (
          <ItemAdvancedOptions
            item={item}
            form={form}
            errors={errors}
            register={register}
            setValue={setValue}
            workflow={workflow}
            groups={allGroups ?? []}
            tags={allTags ?? []}
            allergens={allAllergens ?? []}
            categories={allCategories ?? []}
          />
        )}

        <div className="flex gap-2 justify-end pt-2 border-t border-divider">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            {isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
