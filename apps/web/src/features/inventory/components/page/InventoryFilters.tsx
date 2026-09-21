import { Card, FilterBar, SearchInput, Select } from "@pos/ui";

const STOCK_OPTIONS = [
  { value: "", label: "All stock levels" },
  { value: "low", label: "Low stock only" },
];

export const InventoryFilters = ({
  search,
  stockFilter,
  onSearch,
  onStockFilter,
  onClear,
}: {
  search: string;
  stockFilter: string;
  onSearch: (value: string) => void;
  onStockFilter: (value: string) => void;
  onClear: () => void;
}) => (
  <Card padding="sm">
    <FilterBar onClearAll={search && stockFilter ? onClear : undefined}>
      <SearchInput
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        onClear={() => onSearch("")}
        placeholder="Search item or branch"
        aria-label="Search inventory"
        className="w-full sm:w-72"
      />
      <Select
        aria-label="Filter inventory by stock level"
        valuePrefix="Stock"
        value={stockFilter || undefined}
        placeholder="All stock levels"
        options={STOCK_OPTIONS}
        onChange={(value) => onStockFilter(value ?? "")}
        className="w-48"
      />
    </FilterBar>
  </Card>
);
