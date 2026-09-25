import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Page,
  PageHeader,
  Select,
  Spinner,
} from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import { formatCurrency } from "@/shared/utils/format";
import { useMenuEngineering } from "@/features/analytics/hooks/useMenuEngineering";

type EngineeringQuadrant =
  "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG" | "COST_MISSING";
type EngineeringSort = "margin" | "volume" | "name";

export const MenuEngineeringPage = () => {
  const [windowDays, setWindowDays] = useState("90");
  const [appliedWindowDays, setAppliedWindowDays] = useState("90");
  const [quadrant, setQuadrant] = useState<"ALL" | EngineeringQuadrant>("ALL");
  const [sort, setSort] = useState<EngineeringSort>("volume");
  const engineeringQuery = useMenuEngineering(Number(appliedWindowDays));
  const rows = engineeringQuery.data ?? [];

  const visibleRows = useMemo(() => {
    const filtered =
      quadrant === "ALL"
        ? [...rows]
        : rows.filter((row) => row.quadrant === quadrant);
    return filtered.sort((left, right) => {
      if (sort === "margin") {
        if (left.margin === null) return 1;
        if (right.margin === null) return -1;
        return right.margin - left.margin;
      }
      if (sort === "volume") return right.salesVolume - left.salesVolume;
      return (
        left.menuItemName.localeCompare(right.menuItemName) ||
        (left.variantName ?? "").localeCompare(right.variantName ?? "")
      );
    });
  }, [quadrant, rows, sort]);

  return (
    <Page>
      <PageHeader
        title="Menu engineering"
        description="Turn actual contribution margin and sales volume into owner-facing Star, Puzzle, Plowhorse, and Dog recommendations."
        actions={<Badge variant="info">{windowDays}-day window</Badge>}
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <Select
            label="Analysis window"
            value={windowDays}
            onChange={setWindowDays}
            options={[
              { value: "30", label: "30 days" },
              { value: "60", label: "60 days" },
              { value: "90", label: "90 days" },
              { value: "180", label: "180 days" },
              { value: "365", label: "365 days" },
            ]}
          />
          <Select
            label="Quadrant"
            value={quadrant}
            onChange={(value) =>
              setQuadrant(value as "ALL" | EngineeringQuadrant)
            }
            options={[
              { value: "ALL", label: "All quadrants" },
              { value: "STAR", label: "Stars" },
              { value: "PUZZLE", label: "Puzzles" },
              { value: "PLOWHORSE", label: "Plowhorses" },
              { value: "DOG", label: "Dogs" },
              { value: "COST_MISSING", label: "Cost missing" },
            ]}
          />
          <Select
            label="Sort by"
            value={sort}
            onChange={(value) => setSort(value as EngineeringSort)}
            options={[
              { value: "volume", label: "Sales volume" },
              { value: "margin", label: "Margin" },
              { value: "name", label: "Name" },
            ]}
          />
          <Button
            variant="secondary"
            loading={engineeringQuery.isFetching}
            onClick={() => setAppliedWindowDays(windowDays)}
          >
            Apply
          </Button>
        </div>
      </Card>

      {engineeringQuery.error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="text-sm font-semibold text-danger">
            Menu engineering unavailable
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {extractApiError(engineeringQuery.error)}
          </p>
        </Card>
      ) : engineeringQuery.isLoading && rows.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : visibleRows.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            No menu items match the selected analysis scope.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleRows.map((row) => (
            <Card key={`${row.menuItemId}:${row.variantName ?? ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-text-primary">
                    {row.menuItemName}
                    {row.variantName ? ` — ${row.variantName}` : ""}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {row.salesVolume} sold ·{" "}
                    {row.margin === null
                      ? "Cost not configured"
                      : `${formatCurrency(row.margin)} contribution margin${
                          row.marginPercent === null
                            ? ""
                            : ` · ${row.marginPercent.toFixed(1)}%`
                        }`}
                  </p>
                </div>
                <Badge
                  variant={
                    row.quadrant === "STAR"
                      ? "success"
                      : row.quadrant === "DOG"
                        ? "danger"
                        : "warning"
                  }
                >
                  {row.quadrant === "COST_MISSING"
                    ? "Cost missing"
                    : row.quadrant}
                </Badge>
              </div>
              <div className="mt-4 rounded-lg bg-surface-secondary p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-disabled">
                  Suggested action
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {row.recommendation}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
};

export default MenuEngineeringPage;
