import { useState } from "react";
import type { MenuCategory, MenuItem, FoodType } from "@pos/types";
import { SearchInput, Select } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";

export const FOOD_TYPE_FILTERS: { value: FoodType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "VEG", label: "Veg" },
  { value: "NON_VEG", label: "Non-Veg" },
  { value: "EGG", label: "Egg" },
];
const priceLabel = (item: MenuItem) => {
  const prices = (item.variants ?? []).map((v) => Number(v.price));
  if (!prices.length) return formatCurrency(Number(item.basePrice));
  const min = Math.min(...prices),
    max = Math.max(...prices);
  return min === max
    ? formatCurrency(min)
    : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};
export const MenuPicker = ({
  orderType,
  tableId,
  tablesEnabled,
  tables,
  categories,
  filter,
  onOrderTypeChange,
  availableOrderTypes,
  onTableChange,
  onFilterChange,
  onItemClick,
  emptyMessage,
}: {
  orderType: string;
  tableId: string;
  tablesEnabled: boolean;
  tables?: { id: string; name: string; status: string }[] | undefined;
  categories?: MenuCategory[] | undefined;
  filter: FoodType | "ALL";
  onOrderTypeChange: (v: string) => void;
  availableOrderTypes: readonly { value: string; label: string }[];
  onTableChange: (v: string) => void;
  onFilterChange: (v: FoodType | "ALL") => void;
  onItemClick: (item: MenuItem) => void;
  emptyMessage?: string | undefined;
}) => {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const visible = categories?.map((c) => ({
    ...c,
    menuItems: (c.menuItems ?? []).filter(
      (i) =>
        (filter === "ALL" || i.foodType === filter) &&
        (!normalizedSearch || i.name.toLowerCase().includes(normalizedSearch)),
    ),
  }));
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {availableOrderTypes.length > 1 ? (
          <Select
            value={orderType}
            onChange={(e) => onOrderTypeChange(e)}
            options={availableOrderTypes}
            className="flex-1"
          />
        ) : (
          <div className="flex-1 flex items-center px-3 py-2.5 text-sm rounded-md border border-border bg-surface-secondary text-text-secondary">
            {availableOrderTypes[0]?.label ?? "No order types enabled"}
          </div>
        )}
      </div>
      {orderType === "DINE_IN" && tablesEnabled && (
        <div className="mb-4">
          <Select
            label="Table (required)"
            value={tableId}
            onChange={(e) => onTableChange(e)}
            options={[
              { value: "", label: "Select a table…" },
              ...(tables
                ?.filter((t) => t.status === "AVAILABLE")
                .map((t) => ({ value: t.id, label: t.name })) ?? []),
            ]}
          />
          {!tables?.some((t) => t.status === "AVAILABLE") && (
            <p className="text-xs text-text-disabled mt-1">
              No available tables right now — free one up or choose a different
              order type.
            </p>
          )}
        </div>
      )}
      <SearchInput
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onClear={() => setSearch("")}
        placeholder="Search menu items"
        aria-label="Search menu items"
        className="mb-3"
      />
      <div className="flex items-center gap-2 mb-3">
        {FOOD_TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${filter === f.value ? "border-primary bg-primary-surface text-primary" : "border-border text-text-secondary"}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="max-h-80 space-y-4 overflow-y-auto pr-1 lg:max-h-[calc(100vh-30rem)]">
        {!categories?.flatMap((c) => c.menuItems ?? []).length && (
          <p className="text-sm text-text-disabled text-center py-6">
            {emptyMessage ?? "No menu items available for this order."}
          </p>
        )}
        {visible?.map((cat) =>
          cat.menuItems?.length ? (
            <div key={cat.id}>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                {cat.name}
              </p>
              <div className="space-y-1">
                {cat.menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-primary-surface transition-colors group"
                  >
                    <span className="text-sm text-text-primary group-hover:text-primary-hover">
                      {item.name}
                      {(item.variants?.length > 0 ||
                        (item.modifierGroupLinks?.length ?? 0) > 0) && (
                        <span className="text-xs text-text-disabled ml-1.5">
                          Options ▾
                        </span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-text-primary">
                      {priceLabel(item)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
};
