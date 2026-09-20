import type { ModifierGroup } from "@pos/types";
import { QueryErrorState, StaleDataBanner } from "@pos/ui";
import {
  useItemStationRoutes,
  useKitchenStations,
  useSetItemStationRoute,
} from "@/features/menu/hooks/useKitchenStations";

export const StationRoutingEditor = ({
  itemId,
  groups,
}: {
  itemId: string;
  groups: ModifierGroup[];
}) => {
  const stationsQuery = useKitchenStations();
  const routesQuery = useItemStationRoutes(itemId);
  const stations = stationsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const setRoute = useSetItemStationRoute(itemId);
  if (stationsQuery.isError && !stationsQuery.data)
    return (
      <QueryErrorState
        title="Unable to load kitchen stations"
        description="Kitchen routing cannot be edited until stations are loaded."
        onRetry={() => void stationsQuery.refetch()}
        isRetrying={stationsQuery.isFetching}
      />
    );
  if (routesQuery.isError && !routesQuery.data)
    return (
      <QueryErrorState
        title="Unable to load kitchen routing"
        description="Existing item routes could not be loaded. Retry before changing routing."
        onRetry={() => void routesQuery.refetch()}
        isRetrying={routesQuery.isFetching}
      />
    );
  if (!stations.length) return null;

  const select = (label: string, modifierOptionId?: string) => {
    const route = routes.find(
      (candidate) => candidate.modifierOptionId === (modifierOptionId ?? null),
    );
    return (
      <label
        className="grid gap-1 text-xs text-text-secondary"
        key={modifierOptionId ?? "default"}
      >
        {label}
        <select
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary"
          value={route?.stationId ?? ""}
          disabled={
            stationsQuery.isError || routesQuery.isError || setRoute.isPending
          }
          onChange={(event) =>
            setRoute.mutate({
              stationId: event.target.value || null,
              ...(modifierOptionId ? { modifierOptionId } : {}),
            })
          }
        >
          <option value="">No station</option>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>
      </label>
    );
  };

  return (
    <div className="space-y-3 border-t border-divider pt-4">
      {(stationsQuery.isError && stationsQuery.data) ||
      (routesQuery.isError && routesQuery.data) ? (
        <StaleDataBanner
          message="Kitchen routing could not be refreshed. Showing cached routing; changes are disabled until refreshed."
          onRetry={() => {
            void stationsQuery.refetch();
            void routesQuery.refetch();
          }}
          isRetrying={stationsQuery.isFetching || routesQuery.isFetching}
        />
      ) : null}
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          Kitchen routing
        </h3>
        <p className="text-xs text-text-secondary">
          A modifier route overrides the item’s default station.
        </p>
      </div>
      {select("Default station")}
      <div className="grid gap-2 md:grid-cols-2">
        {groups.flatMap((group) =>
          group.options.map((option) =>
            select(`${group.name}: ${option.name}`, option.id),
          ),
        )}
      </div>
    </div>
  );
};
