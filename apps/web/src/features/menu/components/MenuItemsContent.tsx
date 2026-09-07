import {
  Button,
  EmptyState,
  FilterBar,
  SearchInput,
  SelectMenu,
  Spinner,
} from "@pos/ui";
import type {
  FoodType,
  MenuCategory,
  MenuItem,
  MenuItemStatus,
  MenuTag,
} from "@pos/types";
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { MENU_ITEM_STATUS_OPTIONS } from "@/features/menu/constants";
import { BulkActionsToolbar } from "@/features/menu/components/BulkActionsToolbar";
import { ManualAvailabilityOverrideDialog } from "@/features/menu/components/ManualAvailabilityOverrideDialog";
import { MenuCategorySection } from "@/features/menu/components/MenuCategorySection";

const CATEGORY_BATCH_SIZE = 18;

const FOOD_TYPE_FILTERS: { value: FoodType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "VEG", label: "Veg" },
  { value: "NON_VEG", label: "Non-Veg" },
  { value: "EGG", label: "Egg" },
];

const STATUS_FILTERS: { value: MenuItemStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All statuses" },
  ...MENU_ITEM_STATUS_OPTIONS,
];

export interface MenuItemsContentProps {
  itemSearch: string;
  setItemSearch: (value: string) => void;
  selectMode: boolean;
  selectedIds: string[];
  categories?: MenuCategory[];
  tags?: MenuTag[];
  isLoading: boolean;
  foodTypeFilter: FoodType | "ALL";
  statusFilter: MenuItemStatus | "ALL";
  publishFilter: "ALL" | "PUBLISHED" | "DRAFT";
  setFoodTypeFilter: (value: FoodType | "ALL") => void;
  setStatusFilter: (value: MenuItemStatus | "ALL") => void;
  setPublishFilter: (value: "ALL" | "PUBLISHED" | "DRAFT") => void;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setItemForm: (
    value: { categoryId: string; item: MenuItem | null } | null,
  ) => void;
  toggleAvailMutation: {
    mutate: (value: {
      id: string;
      isAvailable: boolean;
      reason?: string;
    }) => void;
  };
  deleteItemMutation: { mutate: (id: string) => void };
  duplicateItemMutation: {
    mutate: (
      id: string,
      options?: { onSuccess?: (item: MenuItem) => void },
    ) => void;
  };
  publishMutation: {
    mutate: (value: { id: string; publish: boolean }) => void;
  };
}

export const MenuItemsContent = ({
  itemSearch,
  setItemSearch,
  selectMode,
  selectedIds,
  categories,
  tags,
  isLoading,
  foodTypeFilter,
  statusFilter,
  publishFilter,
  setFoodTypeFilter,
  setStatusFilter,
  setPublishFilter,
  setSelectedIds,
  setItemForm,
  toggleAvailMutation,
  deleteItemMutation,
  duplicateItemMutation,
  publishMutation,
}: MenuItemsContentProps) => {
  const [manualOverrideItem, setManualOverrideItem] = useState<MenuItem | null>(
    null,
  );
  const [manualOverrideReason, setManualOverrideReason] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(),
  );
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    {},
  );

  const matchesFilters = useCallback(
    (item: MenuItem) =>
      (!itemSearch.trim() ||
        item.name.toLowerCase().includes(itemSearch.trim().toLowerCase())) &&
      (foodTypeFilter === "ALL" || item.foodType === foodTypeFilter) &&
      (statusFilter === "ALL" || item.status === statusFilter) &&
      (publishFilter === "ALL" ||
        (publishFilter === "PUBLISHED" ? item.isPublished : !item.isPublished)),
    [foodTypeFilter, itemSearch, publishFilter, statusFilter],
  );

  useEffect(() => {
    const first = categories?.[0]?.id;
    if (!first) return;
    setExpandedCategories((current) =>
      current.size ? current : new Set([first]),
    );
  }, [categories]);

  useEffect(() => {
    setVisibleCounts({});
  }, [foodTypeFilter, itemSearch, publishFilter, statusFilter]);

  const hasActiveFilters =
    itemSearch !== "" ||
    foodTypeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    publishFilter !== "ALL";
  const allExpanded =
    (categories?.length ?? 0) > 0 &&
    expandedCategories.size === (categories?.length ?? 0);

  const clearFilters = () => {
    setItemSearch("");
    setFoodTypeFilter("ALL");
    setStatusFilter("ALL");
    setPublishFilter("ALL");
  };

  const toggleSelectedItem = (item: MenuItem) => {
    setSelectedIds((current) =>
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id],
    );
  };

  return (
    <div className="space-y-4">
      {selectMode && selectedIds.length > 0 && (
        <BulkActionsToolbar
          selectedIds={selectedIds}
          categories={categories ?? []}
          tags={tags ?? []}
          onClear={() => setSelectedIds([])}
        />
      )}

      <FilterBar onClearAll={hasActiveFilters ? clearFilters : undefined}>
        <SearchInput
          aria-label="Search menu items"
          placeholder="Search items..."
          value={itemSearch}
          onChange={(event) => setItemSearch(event.target.value)}
          onClear={() => setItemSearch("")}
          className="w-full sm:w-64"
        />
        <SelectMenu
          aria-label="Food type"
          options={FOOD_TYPE_FILTERS}
          value={foodTypeFilter}
          onChange={(value) => setFoodTypeFilter(value as FoodType | "ALL")}
          className="w-36"
        />
        <SelectMenu
          aria-label="Status"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as MenuItemStatus | "ALL")}
          className="w-40"
        />
        <SelectMenu
          aria-label="Publication"
          options={[
            { value: "ALL", label: "All publication" },
            { value: "PUBLISHED", label: "Published" },
            { value: "DRAFT", label: "Drafts" },
          ]}
          value={publishFilter}
          onChange={(value) =>
            setPublishFilter(value as "ALL" | "PUBLISHED" | "DRAFT")
          }
          className="w-40"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            setExpandedCategories(
              allExpanded
                ? new Set()
                : new Set((categories ?? []).map((category) => category.id)),
            )
          }
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </FilterBar>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-6 h-6" />
        </div>
      ) : !categories?.length ? (
        <EmptyState
          icon={({ className }) => <span className={className}>🍽️</span>}
          title="No menu categories"
          description="Create a category first, then add items to it."
        />
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const matchingItems = (category.menuItems ?? []).filter(
              matchesFilters,
            );
            if (hasActiveFilters && matchingItems.length === 0) return null;
            const isExpanded =
              hasActiveFilters || expandedCategories.has(category.id);

            return (
              <MenuCategorySection
                key={category.id}
                category={category}
                items={matchingItems}
                isExpanded={isExpanded}
                selectMode={selectMode}
                selectedIds={selectedIds}
                visibleCount={visibleCounts[category.id] ?? CATEGORY_BATCH_SIZE}
                onToggleExpanded={() =>
                  setExpandedCategories((current) => {
                    const next = new Set(current);
                    next.has(category.id)
                      ? next.delete(category.id)
                      : next.add(category.id);
                    return next;
                  })
                }
                onAddItem={() =>
                  setItemForm({ categoryId: category.id, item: null })
                }
                onToggleSelected={toggleSelectedItem}
                onEditItem={(item) =>
                  setItemForm({ categoryId: category.id, item })
                }
                onPublish={(item) =>
                  publishMutation.mutate({
                    id: item.id,
                    publish: !item.isPublished,
                  })
                }
                onClearOverride={(item) =>
                  toggleAvailMutation.mutate({ id: item.id, isAvailable: true })
                }
                onManualOverride={(item) => {
                  setManualOverrideReason("");
                  setManualOverrideItem(item);
                }}
                onDuplicate={(item) =>
                  duplicateItemMutation.mutate(item.id, {
                    onSuccess: (newItem) =>
                      setItemForm({
                        categoryId: newItem.categoryId,
                        item: newItem,
                      }),
                  })
                }
                onDelete={(item) => deleteItemMutation.mutate(item.id)}
                onLoadMore={() =>
                  setVisibleCounts((current) => ({
                    ...current,
                    [category.id]:
                      (current[category.id] ?? CATEGORY_BATCH_SIZE) +
                      CATEGORY_BATCH_SIZE,
                  }))
                }
              />
            );
          })}
        </div>
      )}

      {manualOverrideItem && (
        <ManualAvailabilityOverrideDialog
          item={manualOverrideItem}
          reason={manualOverrideReason}
          onReasonChange={setManualOverrideReason}
          onClose={() => setManualOverrideItem(null)}
          onSubmit={() => {
            toggleAvailMutation.mutate({
              id: manualOverrideItem.id,
              isAvailable: false,
              reason: manualOverrideReason.trim(),
            });
            setManualOverrideItem(null);
          }}
        />
      )}
    </div>
  );
};
