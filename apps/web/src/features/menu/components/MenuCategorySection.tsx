import { useEffect, useRef } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button, Card, Grid } from "@pos/ui";
import type { MenuCategory, MenuItem } from "@pos/types";
import { MenuItemCard } from "@/features/menu/components/MenuItemCard";

const InfiniteSentinel = ({ onVisible }: { onVisible: () => void }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible();
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible]);
  return <div ref={ref} aria-hidden="true" className="h-px" />;
};

interface MenuCategorySectionProps {
  category: MenuCategory;
  items: MenuItem[];
  isExpanded: boolean;
  selectMode: boolean;
  selectedIds: string[];
  visibleCount: number;
  onToggleExpanded: () => void;
  onAddItem: () => void;
  onToggleSelected: (item: MenuItem) => void;
  onEditItem: (item: MenuItem) => void;
  onPublish: (item: MenuItem) => void;
  onClearOverride: (item: MenuItem) => void;
  onManualOverride: (item: MenuItem) => void;
  onDuplicate: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onLoadMore: () => void;
}

export const MenuCategorySection = ({
  category,
  items,
  isExpanded,
  selectMode,
  selectedIds,
  visibleCount,
  onToggleExpanded,
  onAddItem,
  onToggleSelected,
  onEditItem,
  onPublish,
  onClearOverride,
  onManualOverride,
  onDuplicate,
  onDelete,
  onLoadMore,
}: MenuCategorySectionProps) => {
  const visibleItems = items.slice(0, visibleCount);
  const activeCount = (category.menuItems ?? []).filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const draftCount = (category.menuItems ?? []).filter(
    (item) => !item.isPublished,
  ).length;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`menu-category-${category.id}`}
          onClick={onToggleExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold text-text-primary">
              {category.name}
            </span>
            <span className="mt-0.5 block text-xs text-text-secondary">
              {(category.menuItems?.length ?? 0).toLocaleString()} items ·{" "}
              {activeCount} active
              {draftCount ? ` · ${draftCount} drafts` : ""}
            </span>
          </span>
        </button>
        <Button size="sm" variant="secondary" onClick={onAddItem}>
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {isExpanded && (
        <div
          id={`menu-category-${category.id}`}
          className="border-t border-border px-4 py-4"
        >
          {!visibleItems.length ? (
            <p className="text-sm text-text-disabled text-center py-4">
              {category.menuItems?.length
                ? "No items match this filter"
                : "No items in this category"}
            </p>
          ) : (
            <Grid columns={{ base: 1, sm: 2, lg: 3 }} gap="sm">
              {visibleItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    selectMode={selectMode}
                    isSelected={isSelected}
                    onActivate={() =>
                      selectMode ? onToggleSelected(item) : onEditItem(item)
                    }
                    onPublish={() => onPublish(item)}
                    onToggleAvailability={() => onClearOverride(item)}
                    onManualOverride={() => onManualOverride(item)}
                    onDuplicate={() => onDuplicate(item)}
                    onDelete={() => onDelete(item)}
                  />
                );
              })}
            </Grid>
          )}
          {visibleItems.length < items.length && (
            <>
              <InfiniteSentinel onVisible={onLoadMore} />
              <p className="pt-3 text-center text-xs text-text-disabled">
                Showing {visibleItems.length} of {items.length} items · scroll
                for more
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  );
};
