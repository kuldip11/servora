import { Building2 } from "lucide-react";
import { Card, Pagination } from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";

interface InventoryListProps {
  items: InventoryItem[];
  groupedByBranch: [string, InventoryItem[]][] | null;
  aggregate: boolean;
  loading: boolean;
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onUpdateStock: (item: InventoryItem) => void;
  onLogWaste: (item: InventoryItem) => void;
  onViewImpact: (item: InventoryItem) => void;
  onAddItem: () => void;
}

export const InventoryList = ({
  items,
  groupedByBranch,
  aggregate,
  loading,
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onUpdateStock,
  onLogWaste,
  onViewImpact,
  onAddItem,
}: InventoryListProps) => (
  <Card padding="none" className="overflow-hidden">
    {aggregate && groupedByBranch ? (
      groupedByBranch.map(([branchName, branchItems], index) => (
        <div
          key={branchName}
          className={index > 0 ? "border-t border-border" : undefined}
        >
          <div className="px-4 py-2.5 bg-surface-secondary flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-text-disabled" />
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              {branchName}
            </p>
          </div>
          <InventoryTable
            items={branchItems}
            loading={loading}
            onUpdateStock={onUpdateStock}
            onLogWaste={onLogWaste}
            onViewImpact={onViewImpact}
          />
        </div>
      ))
    ) : (
      <InventoryTable
        items={items}
        loading={loading}
        onUpdateStock={onUpdateStock}
        onLogWaste={onLogWaste}
        onViewImpact={onViewImpact}
        onAddItem={onAddItem}
      />
    )}
    <Pagination
      className="border-t border-border p-4"
      page={page}
      pageCount={pageCount}
      totalItems={totalItems}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  </Card>
);
