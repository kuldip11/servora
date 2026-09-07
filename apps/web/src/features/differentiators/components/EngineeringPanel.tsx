import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, toast } from "@pos/ui";
import { createAnalyticsApi } from "@pos/api-client";
import { DIFFERENTIATORS_SELECT_CLASS } from "@/features/differentiators/constants";
import { apiClient, extractApiError } from "@/shared/lib/api-client";

type EngineeringQuadrant = "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG";
type EngineeringSort = "margin" | "volume" | "name";
type EngineeringRow = {
  menuItemId: string;
  menuItemName: string;
  variantName: string | null;
  margin: number;
  salesVolume: number;
  quadrant: EngineeringQuadrant;
  recommendation: string;
};

const analyticsApi = createAnalyticsApi(apiClient);

export const EngineeringPanel = () => {
  const [windowDays, setWindowDays] = useState("90");
  const [quadrantFilter, setQuadrantFilter] = useState<
    "ALL" | EngineeringQuadrant
  >("ALL");
  const [sort, setSort] = useState<EngineeringSort>("volume");
  const engineeringQuery = useQuery({
    queryKey: ["differentiators", "engineering", windowDays],
    queryFn: () =>
      analyticsApi.menuEngineering<EngineeringRow[]>(Number(windowDays)),
    retry: false,
  });

  useEffect(() => {
    if (engineeringQuery.error) {
      toast({ title: extractApiError(engineeringQuery.error), tone: "danger" });
    }
  }, [engineeringQuery.error]);

  const visibleRows = useMemo(() => {
    const rows =
      quadrantFilter === "ALL"
        ? [...(engineeringQuery.data ?? [])]
        : (engineeringQuery.data ?? []).filter(
            (row) => row.quadrant === quadrantFilter,
          );
    return rows.sort((a, b) => {
      if (sort === "margin") return b.margin - a.margin;
      if (sort === "volume") return b.salesVolume - a.salesVolume;
      return (
        a.menuItemName.localeCompare(b.menuItemName) ||
        (a.variantName ?? "").localeCompare(b.variantName ?? "")
      );
    });
  }, [engineeringQuery.data, quadrantFilter, sort]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-medium text-text-primary">
            Analysis window
            <select
              className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
              value={windowDays}
              onChange={(event) => setWindowDays(event.target.value)}
            >
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 180 days</option>
              <option value="365">Last 365 days</option>
            </select>
          </label>
          <label className="text-sm font-medium text-text-primary">
            Quadrant
            <select
              className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
              value={quadrantFilter}
              onChange={(event) =>
                setQuadrantFilter(
                  event.target.value as "ALL" | EngineeringQuadrant,
                )
              }
            >
              <option value="ALL">All quadrants</option>
              <option value="STAR">Stars</option>
              <option value="PUZZLE">Puzzles</option>
              <option value="PLOWHORSE">Plowhorses</option>
              <option value="DOG">Dogs</option>
            </select>
          </label>
          <label className="text-sm font-medium text-text-primary">
            Sort by
            <select
              className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
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
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleRows.map((row) => (
          <Card key={`${row.menuItemId}:${row.variantName ?? ""}`}>
            <div className="flex justify-between gap-3">
              <strong>
                {row.menuItemName}
                {row.variantName ? ` — ${row.variantName}` : ""}
              </strong>
              <Badge
                variant={
                  row.quadrant === "STAR"
                    ? "success"
                    : row.quadrant === "DOG"
                      ? "danger"
                      : "warning"
                }
              >
                {row.quadrant}
              </Badge>
            </div>
            <p className="mt-2 text-sm">
              {row.salesVolume} sold · margin ₹{row.margin.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              {row.recommendation}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};
