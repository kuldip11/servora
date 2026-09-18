import type {
  KitchenItemRouteResponse,
  KitchenStationResponse,
} from "@pos/contracts";
import { InternalError } from "@/core/errors";
import { itemStationRouting, kitchenStations } from "@/db/schema";

type StationRecord = typeof kitchenStations.$inferSelect;
type RouteRecord = typeof itemStationRouting.$inferSelect;

export const toKitchenStationResponse = (
  row: StationRecord | undefined,
): KitchenStationResponse => {
  if (!row)
    throw new InternalError("Kitchen station response could not be loaded");
  return {
    id: row.id,
    tenantId: row.tenantId,
    branchId: row.branchId,
    name: row.name,
    printerIdentifier: row.printerIdentifier,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const toKitchenItemRouteResponse = (
  row: RouteRecord | undefined,
): KitchenItemRouteResponse => {
  if (!row)
    throw new InternalError("Kitchen routing response could not be loaded");
  return {
    id: row.id,
    menuItemId: row.menuItemId,
    stationId: row.stationId,
    modifierOptionId: row.modifierOptionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
