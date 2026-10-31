import { Card, FilterBar, SearchInput, Select } from "@pos/ui";
import { TABLE_STATUS_OPTIONS } from "@/features/tables/constants";

type Props = {
  tableSearch: string;
  statusFilter: string;
  sectionFilter: string;
  totalCount: number;
  statusCounts: Record<string, number>;
  sections: { value: string; label: string }[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onClearFilters: () => void;
};

export const TablesFilters = ({
  tableSearch,
  statusFilter,
  sectionFilter,
  totalCount,
  statusCounts,
  sections,
  onSearchChange,
  onStatusChange,
  onSectionChange,
  onClearFilters,
}: Props) => {
  const activeFilterCount = [tableSearch, statusFilter, sectionFilter].filter(
    Boolean,
  ).length;

  return (
    <Card padding="sm">
      <FilterBar
        onClearAll={activeFilterCount > 1 ? onClearFilters : undefined}
      >
        <SearchInput
          value={tableSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={() => onSearchChange("")}
          placeholder="Search table or section"
          aria-label="Search tables"
          className="w-full sm:w-64"
        />
        <div className="flex max-w-full gap-1.5 overflow-x-auto py-0.5">
          <button
            type="button"
            onClick={() => onStatusChange("")}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
              !statusFilter
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-text-secondary"
            }`}
          >
            All {totalCount}
          </button>
          {TABLE_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
                statusFilter === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-text-secondary"
              }`}
            >
              {option.label} {statusCounts[option.value] ?? 0}
            </button>
          ))}
        </div>
        {sections.length > 1 ? (
          <Select
            aria-label="Filter tables by section"
            valuePrefix="Section"
            placeholder="All sections"
            value={sectionFilter || undefined}
            options={[{ value: "", label: "All sections" }, ...sections]}
            onChange={(value) => onSectionChange(value ?? "")}
            className="w-44"
          />
        ) : null}
      </FilterBar>
    </Card>
  );
};
