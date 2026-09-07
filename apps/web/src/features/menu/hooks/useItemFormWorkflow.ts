import { useReducer, type Dispatch, type SetStateAction } from "react";
import type { MenuItem } from "@pos/types";

type VariantDraft = {
  id?: string;
  clientKey: string;
  name: string;
  price: string;
};
type DisplayMode = "STANDARD" | "GUIDED_BUILDER";
type TaxMode = "" | "INCLUSIVE" | "EXCLUSIVE";
type PricingMode = "FIXED" | "WEIGHT_BASED" | "OPEN";
type WeightUnit = "G" | "KG" | "LB" | "OZ";
type ZonePricingRule = "AVERAGE" | "HIGHER" | "SUM_HALF";

type State = {
  showAdvanced: boolean;
  variants: VariantDraft[];
  imageUrls: string[];
  newImageUrl: string;
  displayMode: DisplayMode;
  taxMode: TaxMode;
  effectiveFrom: string;
  pricingMode: PricingMode;
  weightUnit: WeightUnit;
  openPriceMin: string;
  openPriceMax: string;
  supportsZones: boolean;
  zonePricingRule: ZonePricingRule;
  trackByCount: boolean;
  manualStockCount: string;
  selectedGroupIds: string[];
  selectedTagIds: string[];
  selectedAllergenIds: string[];
};

type Action = { patch: Partial<State> };
const reducer = (state: State, action: Action): State => ({
  ...state,
  ...action.patch,
});

const resolve = <T>(current: T, next: SetStateAction<T>): T =>
  typeof next === "function" ? (next as (previous: T) => T)(current) : next;

export const useItemFormWorkflow = (item: MenuItem | null) => {
  const [state, dispatch] = useReducer(reducer, item, (initialItem): State => ({
    showAdvanced: false,
    variants:
      initialItem?.variants.map((variant) => ({
        id: variant.id,
        clientKey: variant.id,
        name: variant.name,
        price: String(variant.price),
      })) ?? [],
    imageUrls: initialItem?.images?.map((image) => image.url) ?? [],
    newImageUrl: "",
    displayMode: initialItem?.displayMode ?? "STANDARD",
    taxMode: initialItem?.taxMode ?? "",
    effectiveFrom: initialItem?.effectiveFrom
      ? new Date(initialItem.effectiveFrom).toISOString().slice(0, 16)
      : "",
    pricingMode: initialItem?.pricingMode ?? "FIXED",
    weightUnit: initialItem?.weightUnit ?? "KG",
    openPriceMin:
      initialItem?.openPriceMin != null ? String(initialItem.openPriceMin) : "",
    openPriceMax:
      initialItem?.openPriceMax != null ? String(initialItem.openPriceMax) : "",
    supportsZones: initialItem?.supportsZones ?? false,
    zonePricingRule: initialItem?.zonePricingRule ?? "HIGHER",
    trackByCount: initialItem?.manualStockCount != null,
    manualStockCount:
      initialItem?.manualStockCount != null
        ? String(initialItem.manualStockCount)
        : "",
    selectedGroupIds:
      initialItem?.modifierGroupLinks?.map((link) => link.modifierGroupId) ??
      [],
    selectedTagIds: initialItem?.tagLinks?.map((link) => link.tagId) ?? [],
    selectedAllergenIds:
      initialItem?.allergenLinks?.map((link) => link.allergenId) ?? [],
  }));

  const setter =
    <K extends keyof State>(key: K): Dispatch<SetStateAction<State[K]>> =>
    (next) =>
      dispatch({
        patch: { [key]: resolve(state[key], next) } as Pick<State, K>,
      });

  return {
    ...state,
    setShowAdvanced: setter("showAdvanced"),
    setVariants: setter("variants"),
    setImageUrls: setter("imageUrls"),
    setNewImageUrl: setter("newImageUrl"),
    setDisplayMode: setter("displayMode"),
    setTaxMode: setter("taxMode"),
    setEffectiveFrom: setter("effectiveFrom"),
    setPricingMode: setter("pricingMode"),
    setWeightUnit: setter("weightUnit"),
    setOpenPriceMin: setter("openPriceMin"),
    setOpenPriceMax: setter("openPriceMax"),
    setSupportsZones: setter("supportsZones"),
    setZonePricingRule: setter("zonePricingRule"),
    setTrackByCount: setter("trackByCount"),
    setManualStockCount: setter("manualStockCount"),
    setSelectedGroupIds: setter("selectedGroupIds"),
    setSelectedTagIds: setter("selectedTagIds"),
    setSelectedAllergenIds: setter("selectedAllergenIds"),
  };
};
