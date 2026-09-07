import { useMemo, useState } from "react";
import { Badge, Card, SkeletonCard } from "@pos/ui";
import { formatCurrency } from "@/shared/utils/format";
import { useCostMarginReport } from "@/features/analytics/hooks/useCostMarginReport";

export const CostMarginPanel = ({ branchId }: { branchId: string | null }) => {
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"high" | "low">("high");
  const { data, isLoading } = useCostMarginReport({
    enabled: branchId !== "all",
  });
  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          (data ?? []).map((row) => [row.categoryId, row.categoryName]),
        ).entries(),
      ),
    [data],
  );
  const rows = useMemo(
    () =>
      [
        ...(data ?? []).filter(
          (row) => category === "all" || row.categoryId === category,
        ),
      ].sort((a, b) => {
        if (a.marginPercent === null) return 1;
        if (b.marginPercent === null) return -1;
        return sort === "high"
          ? b.marginPercent - a.marginPercent
          : a.marginPercent - b.marginPercent;
      }),
    [data, category, sort],
  );
  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Recipe cost & margin
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Current authoritative selling price minus recipe cost, including
            variant scope, sub-recipes and yield.
          </p>
        </div>
        {branchId !== "all" ? (
          <div className="flex gap-2">
            <select
              aria-label="Filter margin report by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary"
            >
              <option value="all">All categories</option>
              {categories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort margin report"
              value={sort}
              onChange={(e) => setSort(e.target.value as "high" | "low")}
              className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-primary"
            >
              <option value="high">Margin: high to low</option>
              <option value="low">Margin: low to high</option>
            </select>
          </div>
        ) : null}
      </div>
      {branchId === "all" ? (
        <p className="py-8 text-center text-sm text-text-disabled">
          Select a branch to calculate inventory-backed recipe cost and margin.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : !rows.length ? (
        <p className="py-8 text-center text-sm text-text-disabled">
          No menu items to report yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs text-text-secondary">
              <tr>
                <th className="py-2 pr-3">Item</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3 text-right">Price</th>
                <th className="py-2 pr-3 text-right">Cost</th>
                <th className="py-2 pr-3 text-right">Margin</th>
                <th className="py-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={`${row.menuItemId}:${row.variantId ?? "base"}`}>
                  <td className="py-2.5 pr-3 font-medium text-text-primary">
                    {row.menuItemName}
                    {row.variantName ? (
                      <span className="ml-1 text-xs font-normal text-text-secondary">
                        · {row.variantName}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 pr-3 text-text-secondary">
                    {row.categoryName}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {formatCurrency(row.price)}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {row.cost === null ? "—" : formatCurrency(row.cost)}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-medium">
                    {row.margin === null ? "—" : formatCurrency(row.margin)}
                  </td>
                  <td className="py-2.5 text-right">
                    {row.marginPercent === null ? (
                      <Badge variant="warning">Cost not configured</Badge>
                    ) : (
                      <Badge
                        variant={
                          row.marginPercent >= 50
                            ? "success"
                            : row.marginPercent >= 25
                              ? "warning"
                              : "danger"
                        }
                      >
                        {row.marginPercent.toFixed(1)}%
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};
