import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { Input } from "@pos/ui";
import type { MenuItem } from "@pos/types";
import type { MenuItemFormValues } from "@pos/validation";
import { MenuMembershipsEditor } from "./forms/MenuMembershipsEditor";
import { ItemMediaVariantsSection } from "./forms/ItemMediaVariantsSection";
import { ItemAssociationsSection } from "./forms/ItemAssociationsSection";
import { ItemOperationalPanels } from "./forms/ItemOperationalPanels";
import { ItemOrderingExperienceSection } from "./forms/ItemOrderingExperienceSection";
import { ItemPricingStockSection } from "./forms/ItemPricingStockSection";
import { ItemRecipeDeductionSection } from "./forms/ItemRecipeDeductionSection";
import type { useItemFormWorkflow } from "@/features/menu/hooks/useItemFormWorkflow";
import type { useModifierGroups } from "@/features/menu/hooks/useModifierGroups";
import type { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import type { useMenuAllergens } from "@/features/menu/hooks/useMenuAllergens";
import type { useMenuCategories } from "@/features/menu";

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
    selectedGroupIds,
    selectedTagIds,
    selectedAllergenIds,
    setVariants,
    setImageUrls,
    setNewImageUrl,
    setSelectedGroupIds,
    setSelectedTagIds,
    setSelectedAllergenIds,
  } = workflow;
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
      <ItemPricingStockSection workflow={workflow} />
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
      <ItemOrderingExperienceSection workflow={workflow} groups={groups} />
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
      <ItemRecipeDeductionSection item={item} form={form} setValue={setValue} />
      <ItemOperationalPanels
        item={item}
        groups={groups}
        selectedGroupIds={selectedGroupIds}
      />
    </div>
  );
};
