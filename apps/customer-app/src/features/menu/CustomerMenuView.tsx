import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@pos/ui";
import type { CustomerCombo, CustomerMenuItem } from "@/api";
import { CustomerCategoryNav } from "./components/CustomerCategoryNav";
import { CustomerMenuHeader } from "./components/CustomerMenuHeader";
import { CustomerMenuOverlays } from "./components/CustomerMenuOverlays";
import { PopularMenuSection } from "./components/PopularMenuSection";
import { ProgressiveMenuSection } from "./components/ProgressiveMenuSection";

export interface CustomerMenuSessionView {
  mode: "DINE_IN" | "TAKEAWAY";
  table: string | null;
  area: string;
  restaurant: string;
}

interface CustomerMenuViewProps {
  session: CustomerMenuSessionView;
  placedOrder: boolean;
  itemCount: number;
  total: number;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  categories: Array<{ id: string; name: string }>;
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
  combos: CustomerCombo[];
  visibleItems: CustomerMenuItem[];
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  onViewOrder: () => void;
  onCart: () => void;
  onOpenCombo: (combo: CustomerCombo) => void;
  onOpenItem: (item: CustomerMenuItem) => void;
}

export const CustomerMenuView = ({
  session,
  placedOrder,
  itemCount,
  total,
  search,
  setSearch,
  categories,
  category,
  setCategory,
  combos,
  visibleItems,
  error,
  setError,
  onViewOrder,
  onCart,
  onOpenCombo,
  onOpenItem,
}: CustomerMenuViewProps) => {
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const popularItems = useMemo(() => {
    const tagged = visibleItems.filter((item) =>
      item.tagLinks.some((link) => link.tag.name.toLowerCase() === "popular"),
    );
    return tagged.length ? tagged : visibleItems.slice(0, 6);
  }, [visibleItems]);
  const categorySections = useMemo(
    () =>
      categories
        .filter((option) => option.name !== "Popular")
        .map((option) => ({
          ...option,
          items: visibleItems.filter((item) => item.categoryId === option.id),
        }))
        .filter((section) => section.items.length > 0),
    [categories, visibleItems],
  );
  const categoryCounts = useMemo(
    () =>
      new Map<string, number>([
        ["popular", popularItems.length],
        ...categorySections.map(
          (section) => [section.id, section.items.length] as const,
        ),
      ]),
    [categorySections, popularItems.length],
  );

  const jumpToCategory = (id: string, name: string) => {
    setCategory(name);
    setCategorySheetOpen(false);
    window.requestAnimationFrame(() =>
      document
        .getElementById(`menu-section-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <div className="customer-experience min-h-screen text-text-primary selection:bg-primary-surface">
      <CustomerMenuHeader
        session={session}
        placedOrder={placedOrder}
        search={search}
        onSearchChange={setSearch}
        onViewOrder={onViewOrder}
      />

      <CustomerCategoryNav
        categories={categories}
        activeCategory={category}
        onSelect={(option) => jumpToCategory(option.id, option.name)}
      />

      <main className="mx-auto max-w-5xl px-4 pb-36 pt-6 sm:px-6 sm:pb-32 lg:px-8">
        {search ? (
          <ProgressiveMenuSection
            sectionId="search"
            title={`“${search}”`}
            eyebrow="Search results"
            items={visibleItems}
            onOpenItem={onOpenItem}
          />
        ) : (
          <>
            <PopularMenuSection
              items={popularItems}
              combos={combos}
              onOpenItem={onOpenItem}
              onOpenCombo={onOpenCombo}
            />
            {categorySections.map((section) => (
              <ProgressiveMenuSection
                key={section.id}
                sectionId={section.id}
                title={section.name}
                items={section.items}
                onOpenItem={onOpenItem}
                onActive={() => setCategory(section.name)}
              />
            ))}
          </>
        )}

        {visibleItems.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface py-8">
            <EmptyState
              icon={Search}
              title="No dishes found"
              description="Try another category or a different search term."
              size="sm"
            />
          </div>
        )}
      </main>

      <CustomerMenuOverlays
        search={search}
        itemCount={itemCount}
        total={total}
        categories={categories}
        activeCategory={category}
        categoryCounts={categoryCounts}
        categorySheetOpen={categorySheetOpen}
        onCategorySheetOpenChange={setCategorySheetOpen}
        onSelectCategory={(option) => jumpToCategory(option.id, option.name)}
        error={error}
        onDismissError={() => setError(null)}
        onCart={onCart}
      />
    </div>
  );
};
