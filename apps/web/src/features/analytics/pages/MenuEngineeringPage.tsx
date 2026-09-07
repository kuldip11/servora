import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Page, PageHeader, Spinner } from "@pos/ui";
import { createAnalyticsApi } from "@pos/api-client";
import { apiClient, extractApiError } from "@/shared/lib/api-client";

const analyticsApi = createAnalyticsApi(apiClient);
import { formatCurrency } from "@/shared/utils/format";

type EngineeringQuadrant =
  "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG" | "COST_MISSING";
type EngineeringSort = "margin" | "volume" | "name";

type EngineeringRow = {
  menuItemId: string;
  menuItemName: string;
  variantName: string | null;
  margin: number | null;
  marginPercent: number | null;
  salesVolume: number;
  quadrant: EngineeringQuadrant;
  recommendation: string;
};

import { ANALYTICS_SELECT_CLASS } from "@/features/analytics/constants";

export const MenuEngineeringPage = () => {
  const [windowDays, setWindowDays] = useState("90");
  const [quadrant, setQuadrant] = useState<"ALL" | EngineeringQuadrant>("ALL");
  const [sort, setSort] = useState<EngineeringSort>("volume");
  const [rows, setRows] = useState<EngineeringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(days = windowDays) {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await analyticsApi.menuEngineering<EngineeringRow[]>(Number(days)),
      );
    } catch (reason) {
      setError(extractApiError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load("90");
  }, []);

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
          <label className="text-sm font-medium text-text-primary">
            Analysis window
            <select
              className={`mt-1 w-full ${ANALYTICS_SELECT_CLASS}`}
              value={windowDays}
              onChange={(event) => setWindowDays(event.target.value)}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
          </label>
          <label className="text-sm font-medium text-text-primary">
            Quadrant
            <select
              className={`mt-1 w-full ${ANALYTICS_SELECT_CLASS}`}
              value={quadrant}
              onChange={(event) =>
                setQuadrant(event.target.value as "ALL" | EngineeringQuadrant)
              }
            >
              <option value="ALL">All quadrants</option>
              <option value="STAR">Stars</option>
              <option value="PUZZLE">Puzzles</option>
              <option value="PLOWHORSE">Plowhorses</option>
              <option value="DOG">Dogs</option>
              <option value="COST_MISSING">Cost missing</option>
            </select>
          </label>
          <label className="text-sm font-medium text-text-primary">
            Sort by
            <select
              className={`mt-1 w-full ${ANALYTICS_SELECT_CLASS}`}
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as EngineeringSort)
              }
            >
              <option value="volume">Sales volume</option>
              <option value="margin">Margin</option>
              <option value="name">Name</option>
            </select>
          </label>
          <Button
            variant="secondary"
            loading={loading}
            onClick={() => void load()}
          >
            Apply
          </Button>
        </div>
      </Card>

      {error ? (
        <Card className="border-danger/30 bg-danger-surface">
          <p className="text-sm font-semibold text-danger">
            Menu engineering unavailable
          </p>
          <p className="mt-1 text-sm text-text-secondary">{error}</p>
        </Card>
      ) : loading && rows.length === 0 ? (
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
