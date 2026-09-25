import { useMemo, useState } from "react";
import { Badge, Card, QueryErrorState, Select, StaleDataBanner } from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import { useDifferentiatorEngineering } from "@/features/differentiators/hooks/useDifferentiators";
import type { EngineeringQuadrant } from "@/features/differentiators/services/differentiators.service";

type EngineeringSort = "margin" | "volume" | "name";

export const EngineeringPanel = () => {
  const [windowDays, setWindowDays] = useState("90");
  const [quadrantFilter, setQuadrantFilter] = useState<
    "ALL" | EngineeringQuadrant
  >("ALL");
  const [sort, setSort] = useState<EngineeringSort>("volume");
  const engineeringQuery = useDifferentiatorEngineering(windowDays);

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
          <Select
            label="Analysis window"
            value={windowDays}
            onChange={setWindowDays}
            options={[
              { value: "30", label: "Last 30 days" },
              { value: "60", label: "Last 60 days" },
              { value: "90", label: "Last 90 days" },
              { value: "180", label: "Last 180 days" },
              { value: "365", label: "Last 365 days" },
            ]}
          />
          <Select
            label="Quadrant"
            value={quadrantFilter}
            onChange={(value) =>
              setQuadrantFilter(value as "ALL" | EngineeringQuadrant)
            }
            options={[
              { value: "ALL", label: "All quadrants" },
              { value: "STAR", label: "Stars" },
              { value: "PUZZLE", label: "Puzzles" },
              { value: "PLOWHORSE", label: "Plowhorses" },
              { value: "DOG", label: "Dogs" },
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
        </div>
      </Card>
      {engineeringQuery.isError && engineeringQuery.data !== undefined ? (
        <StaleDataBanner
          message="Menu engineering refresh failed — showing the latest analysis available."
          isRetrying={engineeringQuery.isFetching}
          onRetry={() => void engineeringQuery.refetch()}
        />
      ) : null}
      {engineeringQuery.isError && engineeringQuery.data === undefined ? (
        <QueryErrorState
          title="Unable to load menu engineering"
          description={extractApiError(
            engineeringQuery.error,
            "Menu engineering analysis could not be loaded.",
          )}
          isRetrying={engineeringQuery.isFetching}
          onRetry={() => void engineeringQuery.refetch()}
        />
      ) : (
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
      )}
    </div>
  );
};
