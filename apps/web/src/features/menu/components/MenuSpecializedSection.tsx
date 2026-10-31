import { useState } from "react";
import { BookOpen, CalendarClock } from "lucide-react";
import { Button, Card, Grid, SearchInput, Spinner } from "@pos/ui";
import { useMenuCategories } from "@/features/menu";
import { ItemFormModal } from "./ItemFormModal";
import { SubRecipeManager } from "./SubRecipeManager";
import type { MenuItem } from "@pos/types";

interface Props {
  mode: "recipes" | "availability";
}

export const MenuSpecializedSection = ({ mode }: Props) => {
  const { data: categories, isLoading } = useMenuCategories();
  const [search, setSearch] = useState("");
  const [itemForm, setItemForm] = useState<{
    categoryId: string;
    item: MenuItem;
  } | null>(null);

  const items = (categories ?? []).flatMap((category) =>
    (category.menuItems ?? []).map((item) => ({ category, item })),
  );
  const visible = items.filter(({ item }) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          {mode === "recipes" ? "Recipes" : "Availability"}
        </h2>
        <p className="text-sm text-text-secondary">
          {mode === "recipes"
            ? "Open an item to manage its recipe and inventory deduction settings."
            : "Open an item to manage schedules and branch-specific availability overrides."}
        </p>
      </div>
      {mode === "recipes" ? <SubRecipeManager /> : null}
      <SearchInput
        aria-label={`Search items for ${mode}`}
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        className="w-full sm:w-72"
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6" />
        </div>
      ) : !visible.length ? (
        <Card>
          <div className="py-10 text-center text-sm text-text-secondary">
            No matching menu items.
          </div>
        </Card>
      ) : (
        <Grid columns={{ base: 1, sm: 2, lg: 3 }} gap="sm">
          {visible.map(({ category, item }) => (
            <Card key={item.id}>
              <div className="flex items-start gap-3">
                {mode === "recipes" ? (
                  <BookOpen className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <CalendarClock className="w-5 h-5 text-primary shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {category.name}
                  </p>
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant="secondary"
                onClick={() => setItemForm({ categoryId: category.id, item })}
              >
                {mode === "recipes" ? "Manage Recipe" : "Manage Availability"}
              </Button>
            </Card>
          ))}
        </Grid>
      )}

      {itemForm && (
        <ItemFormModal
          categoryId={itemForm.categoryId}
          item={itemForm.item}
          onClose={() => setItemForm(null)}
        />
      )}
    </div>
  );
};
