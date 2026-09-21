import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormErrorSummary,
  Modal,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { useMenuCategories } from "@/features/menu";
import { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import { useMenuAllergens } from "@/features/menu/hooks/useMenuAllergens";
import { useSaveMenuItem } from "@/features/menu/hooks/useSaveMenuItem";
import { useItemFormWorkflow } from "@/features/menu/hooks/useItemFormWorkflow";
import { ItemAdvancedOptions } from "./ItemAdvancedOptions";
import { ItemCoreFields } from "./ItemCoreFields";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import type {
  MenuItem,
  FoodType,
  SpiceLevel,
  MenuItemStatus,
} from "@pos/types";
import { menuItemFormSchema, type MenuItemFormValues } from "@pos/validation";
import {
  toMenuItemPayload,
  validateAdvancedItemPricing,
} from "@/features/menu/helpers/item-form-mapper";

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
    formState: { errors, isDirty: formIsDirty, isValid },
  } = useForm<MenuItemFormValues>({
    resolver: zodResolver(menuItemFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
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
  const groupsQuery = useModifierGroups();
  const tagsQuery = useMenuTags();
  const allergensQuery = useMenuAllergens();
  const categoriesQuery = useMenuCategories();
  const allGroups = groupsQuery.data;
  const allTags = tagsQuery.data;
  const allAllergens = allergensQuery.data;
  const allCategories = categoriesQuery.data;
  const dependencyQueries = [
    groupsQuery,
    tagsQuery,
    allergensQuery,
    categoriesQuery,
  ];
  const advancedDependencyFailed =
    showAdvanced &&
    dependencyQueries.some((query) => query.isError && !query.data);
  const advancedDependencyStale =
    showAdvanced &&
    dependencyQueries.some((query) => query.isError && Boolean(query.data));
  const retryAdvancedDependencies = () => {
    for (const query of dependencyQueries) {
      if (query.isError) void query.refetch();
    }
  };

  const saveMutation = useSaveMenuItem();
  const formApiErrors = useFormApiErrors<MenuItemFormValues>();
  const editUnchanged = isEdit && !formIsDirty && !workflow.isDirty;

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

    const advancedPricing = validateAdvancedItemPricing(workflow);
    if (!advancedPricing.success) {
      setError("basePrice", {
        message:
          advancedPricing.error.issues[0]?.message ??
          "Invalid advanced pricing configuration",
      });
      return;
    }

    const payload = toMenuItemPayload({
      categoryId,
      values,
      workflow,
      isEdit,
    });

    saveMutation.mutate(
      { item, payload },
      {
        onSuccess: onClose,
        onError: (error) =>
          formApiErrors.handleApiError(
            error,
            setError,
            [
              "name",
              "description",
              "basePrice",
              "manualCost",
              "taxRate",
              "foodType",
              "spiceLevel",
              "sku",
              "prepTimeMinutes",
              "hsnCode",
              "status",
              "availabilityReason",
              "variants",
              "imageUrls",
              "modifierGroupIds",
              "tagIds",
              "allergenIds",
            ],
            "Failed to save menu item",
          ),
      },
    );
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
        onSubmit={handleSubmit((values) => {
          formApiErrors.clearFormErrors();
          handleSave(values);
        })}
      >
        <FormErrorSummary messages={formApiErrors.formErrorMessages} />
        <ItemCoreFields
          form={form}
          errors={errors}
          register={register}
          setValue={setValue}
          taxMode={taxMode}
          setTaxMode={setTaxMode}
        />

        <button
          type="button"
          onClick={() => setShowAdvanced((current) => !current)}
          className="text-sm font-medium text-primary hover:text-primary-hover"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "Hide advanced options" : "Show advanced options"}
        </button>

        {showAdvanced && advancedDependencyFailed ? (
          <QueryErrorState
            title="Unable to load advanced menu options"
            description="Modifier groups, tags, allergens, or categories could not be loaded. Retry before saving advanced changes."
            onRetry={retryAdvancedDependencies}
            isRetrying={dependencyQueries.some((query) => query.isFetching)}
          />
        ) : null}
        {showAdvanced && advancedDependencyStale ? (
          <StaleDataBanner
            message="Advanced menu options could not be refreshed. Showing cached options; saving is disabled until refreshed."
            onRetry={retryAdvancedDependencies}
            isRetrying={dependencyQueries.some((query) => query.isFetching)}
          />
        ) : null}

        {showAdvanced && !advancedDependencyFailed && (
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
          <Button
            type="submit"
            loading={saveMutation.isPending}
            disabled={
              saveMutation.isPending ||
              !isValid ||
              editUnchanged ||
              advancedDependencyFailed ||
              advancedDependencyStale
            }
          >
            {isEdit ? "Save Changes" : "Add Item"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
