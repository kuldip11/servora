import { SelectMenu } from "@pos/ui";
import { CategoryTabs } from "@/features/menu/components/CategoryTabs";
import { SearchBar } from "@/features/menu/components/SearchBar";
import type { WaiterMenuCategory } from "@/features/menu/api/menu";

type ActiveMenuOption = { id: string; name: string };
type FoodTypeFilter = "ALL" | "VEG" | "NON_VEG" | "EGG";

type MenuCatalogControlsProps = {
  activeMenus: ActiveMenuOption[];
  selectedMenuId: string;
  onMenuChange: (menuId: string) => void;
  menuSearch: string;
  onMenuSearchChange: (value: string) => void;
  foodTypeFilter: FoodTypeFilter;
  onFoodTypeChange: (value: FoodTypeFilter) => void;
  categories: WaiterMenuCategory[] | undefined;
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
};

export const MenuCatalogControls = ({
  activeMenus,
  selectedMenuId,
  onMenuChange,
  menuSearch,
  onMenuSearchChange,
  foodTypeFilter,
  onFoodTypeChange,
  categories,
  activeCategory,
  onCategoryChange,
}: MenuCatalogControlsProps) => (
  <div className="shrink-0 border-b border-border bg-background">
    {activeMenus.length > 1 && (
      <div className="px-4 pt-3">
        <SelectMenu
          label="Menu"
          value={selectedMenuId || undefined}
          onChange={onMenuChange}
          className="min-h-11 rounded-xl"
          options={activeMenus.map((menu) => ({
            value: menu.id,
            label: menu.name,
          }))}
        />
      </div>
    )}
    <SearchBar value={menuSearch} onChange={onMenuSearchChange} />
    <CategoryTabs
      foodTypeFilter={foodTypeFilter}
      onFoodTypeChange={onFoodTypeChange}
      categories={categories}
      activeCategory={activeCategory}
      onCategoryChange={onCategoryChange}
      menuSearch={menuSearch}
    />
  </div>
);
