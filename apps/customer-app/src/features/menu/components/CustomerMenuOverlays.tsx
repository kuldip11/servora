import { ChevronRight, LayoutGrid } from "lucide-react";
import { BottomSheet, Button } from "@pos/ui";
import { formatMoney } from "@/shared/utils/money";

type Category = { id: string; name: string };

type CustomerMenuOverlaysProps = {
  search: string;
  itemCount: number;
  total: number;
  categories: Category[];
  activeCategory: string;
  categoryCounts: Map<string, number>;
  categorySheetOpen: boolean;
  onCategorySheetOpenChange: (open: boolean) => void;
  onSelectCategory: (category: Category) => void;
  error: string | null;
  onDismissError: () => void;
  onCart: () => void;
};

export const CustomerMenuOverlays = ({
  search,
  itemCount,
  total,
  categories,
  activeCategory,
  categoryCounts,
  categorySheetOpen,
  onCategorySheetOpenChange,
  onSelectCategory,
  error,
  onDismissError,
  onCart,
}: CustomerMenuOverlaysProps) => (
  <>
    {!search && (
      <>
        <button
          type="button"
          aria-label="Browse menu categories"
          onClick={() => onCategorySheetOpenChange(true)}
          className={`fixed right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#174d34] text-white shadow-[0_12px_30px_rgba(8,50,31,0.35)] transition hover:scale-105 sm:hidden ${
            itemCount > 0
              ? "bottom-[calc(6.75rem+env(safe-area-inset-bottom))]"
              : "bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
        <BottomSheet
          open={categorySheetOpen}
          onClose={() => onCategorySheetOpenChange(false)}
          title="Browse categories"
          description="Jump to a menu category"
        >
          <div className="space-y-2">
            {categories.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectCategory(option)}
                className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                  activeCategory === option.name
                    ? "border-primary bg-primary-surface text-primary"
                    : "border-border bg-surface text-text-primary"
                }`}
              >
                <span className="font-semibold">{option.name}</span>
                <span className="text-xs text-text-secondary">
                  {categoryCounts.get(option.id) ?? 0} items
                </span>
              </button>
            ))}
          </div>
        </BottomSheet>
      </>
    )}

    {error && (
      <div
        role="alert"
        className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-xl rounded-2xl border border-danger bg-danger-surface p-4 text-sm font-medium text-danger shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={onDismissError}>
            Dismiss
          </Button>
        </div>
      </div>
    )}

    {itemCount > 0 && (
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-7 sm:px-6">
        <button
          type="button"
          onClick={onCart}
          className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between rounded-2xl bg-primary px-5 text-primary-foreground shadow-[0_16px_35px_rgba(14,58,36,0.32)] transition hover:bg-primary-hover"
        >
          <span className="text-left">
            <span className="block text-sm font-bold">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
            <span className="block text-[11px] opacity-75">
              Ready to review
            </span>
          </span>
          <span className="flex items-center gap-2 text-sm font-bold">
            View order · {formatMoney(total)}{" "}
            <ChevronRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    )}
  </>
);
