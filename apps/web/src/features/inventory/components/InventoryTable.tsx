import { MoreHorizontal, Package, Plus } from "lucide-react";
import {
  Button,
  DropdownMenu,
  IconButton,
  StatusBadge,
  Table,
  type Column,
} from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import { formatCurrency } from "@/shared/utils";

export const InventoryTable = ({
  items,
  loading,
  onUpdateStock,
  onLogWaste,
  onViewImpact,
  onAddItem,
}: {
  items: InventoryItem[];
  loading: boolean;
  onUpdateStock: (item: InventoryItem) => void;
  onLogWaste: (item: InventoryItem) => void;
  onViewImpact: (item: InventoryItem) => void;
  onAddItem?: () => void;
}) => {
  const columns: Column<InventoryItem>[] = [
    {
      id: "name",
      header: "Item",
      cell: (item) => (
        <span className="font-medium text-text-primary">{item.name}</span>
      ),
      sortable: true,
      sortValue: (item) => item.name,
    },
    {
      id: "unit",
      header: "Unit",
      cell: (item) => <span className="text-text-secondary">{item.unit}</span>,
    },
    {
      id: "currentStock",
      header: "Current Stock",
      sortable: true,
      sortValue: (item) => parseFloat(String(item.currentStock)),
      cell: (item) => {
        const current = parseFloat(String(item.currentStock));
        const minimum = parseFloat(String(item.minimumStock));
        return (
          <span
            className={
              current <= minimum
                ? "font-semibold text-danger"
                : "font-semibold text-text-primary"
            }
          >
            {current.toFixed(2)}
          </span>
        );
      },
    },
    {
      id: "minimumStock",
      header: "Min Stock",
      cell: (item) => (
        <span className="text-text-secondary">
          {parseFloat(String(item.minimumStock)).toFixed(2)}
        </span>
      ),
    },
    {
      id: "costPerUnit",
      header: "Cost/Unit",
      cell: (item) => (
        <span className="text-text-primary">
          {formatCurrency(parseFloat(String(item.costPerUnit)))}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (item) =>
        parseFloat(String(item.currentStock)) <=
        parseFloat(String(item.minimumStock)) ? (
          <StatusBadge tone="danger" label="Low Stock" />
        ) : (
          <StatusBadge tone="success" label="In Stock" />
        ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" onClick={() => onUpdateStock(item)}>
            Update Stock
          </Button>
          <DropdownMenu
            align="end"
            trigger={
              <IconButton
                icon={MoreHorizontal}
                size="sm"
                variant="ghost"
                aria-label={`More actions for ${item.name}`}
              />
            }
            items={[
              { label: "Log waste", onSelect: () => onLogWaste(item) },
              { label: "Recipe impact", onSelect: () => onViewImpact(item) },
            ]}
          />
        </div>
      ),
    },
  ];
  return (
    <Table
      columns={columns}
      data={items}
      getRowId={(item) => item.id}
      loading={loading}
      maxHeight="min(55vh, 36rem)"
      emptyIcon={Package}
      emptyTitle="No inventory items"
      emptyDescription="Start tracking your ingredients and supplies."
      emptyAction={
        onAddItem ? (
          <Button onClick={onAddItem}>
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        ) : undefined
      }
    />
  );
};
