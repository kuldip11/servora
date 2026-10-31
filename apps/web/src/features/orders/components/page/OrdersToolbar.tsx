import { Plus } from "lucide-react";
import { Button, FilterBar, SearchInput, Select, Toolbar } from "@pos/ui";
import {
  ORDER_STATUS_OPTIONS,
  ORDER_TYPE_OPTIONS,
} from "@/features/orders/constants";

export const OrdersToolbar = ({
  total,
  search,
  statusFilter,
  typeFilter,
  canCreate,
  onSearch,
  onStatusFilter,
  onTypeFilter,
  onClear,
  onCreate,
}: {
  total: number;
  search: string;
  statusFilter: string;
  typeFilter: string;
  canCreate: boolean;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onTypeFilter: (value: string) => void;
  onClear: () => void;
  onCreate: () => void;
}) => (
  <div className="p-md border-b border-border">
    <Toolbar
      title="Orders"
      subtitle={`${total.toLocaleString()} total orders`}
      actions={
        canCreate ? (
          <Button onClick={onCreate}>
            <Plus className="w-4 h-4" /> New Order
          </Button>
        ) : undefined
      }
    />
    <FilterBar
      className="mt-4"
      onClearAll={
        [search, statusFilter, typeFilter].filter(Boolean).length > 1
          ? onClear
          : undefined
      }
    >
      <SearchInput
        placeholder="Search order ID..."
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        onClear={() => onSearch("")}
        className="max-w-xs"
      />
      <Select
        aria-label="Filter orders by status"
        valuePrefix="Status"
        options={ORDER_STATUS_OPTIONS}
        value={statusFilter}
        onChange={(value) => onStatusFilter(value ?? "")}
        className="w-44"
      />
      <Select
        aria-label="Filter orders by type"
        valuePrefix="Type"
        options={ORDER_TYPE_OPTIONS}
        value={typeFilter}
        onChange={(value) => onTypeFilter(value ?? "")}
        className="w-40"
      />
    </FilterBar>
  </div>
);
