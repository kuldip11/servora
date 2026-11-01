import type { AuthContext } from "@/core/auth";
import { requirePermission } from "@/core/auth";
import { InternalError, NotFoundError, ValidationError } from "@/core/errors";
import { stationRepository } from "./station.repository";

export interface StationInput {
  name: string;
  branchId?: string;
  printerIdentifier?: string | null;
  sortOrder?: number;
}
export interface RouteInput {
  stationId: string;
  modifierOptionId?: string | null;
}

export const stationResolver = {
  async resolveForOrderItem(
    tenantId: string,
    menuItemId: string,
    selectedModifierIds: string[],
  ) {
    const routes = await stationRepository.listRoutes(tenantId, menuItemId);
    for (const modifierId of selectedModifierIds) {
      const override = routes.find(
        (route) => route.modifierOptionId === modifierId,
      );
      if (override) return override.stationId;
    }
    return (
      routes.find((route) => route.modifierOptionId === null)?.stationId ?? null
    );
  },
};

export const stationService = {
  async list(auth: AuthContext, branchId?: string) {
    requirePermission(auth, "menu:read");
    return stationRepository.list(
      auth.tenantId,
      branchId ?? auth.branchId ?? undefined,
    );
  },
  async create(auth: AuthContext, input: StationInput) {
    requirePermission(auth, "menu:update");
    const branchId = input.branchId ?? auth.branchId;
    if (!branchId)
      throw new ValidationError("A branch is required for a kitchen station");
    const created = await stationRepository.create({
      ...input,
      branchId,
      tenantId: auth.tenantId,
    });
    if (!created)
      throw new InternalError("Kitchen station could not be created");
    return created;
  },
  async update(
    auth: AuthContext,
    id: string,
    input: Partial<Omit<StationInput, "branchId">>,
  ) {
    requirePermission(auth, "menu:update");
    const existing = await stationRepository.findById(auth.tenantId, id);
    if (!existing) throw new NotFoundError("Kitchen station not found");
    return stationRepository.update(auth.tenantId, id, input);
  },
  async remove(auth: AuthContext, id: string) {
    requirePermission(auth, "menu:update");
    const deleted = await stationRepository.remove(auth.tenantId, id);
    if (!deleted) throw new NotFoundError("Kitchen station not found");
  },
  async listRoutes(auth: AuthContext, menuItemId: string) {
    requirePermission(auth, "menu:read");
    return stationRepository.listRoutes(auth.tenantId, menuItemId);
  },
  async setRoute(auth: AuthContext, menuItemId: string, input: RouteInput) {
    requirePermission(auth, "menu:update");
    const resources = await stationRepository.findRoutingResources(
      auth.tenantId,
      menuItemId,
      input.stationId,
      input.modifierOptionId,
    );
    if (
      !resources.item ||
      !resources.station ||
      (input.modifierOptionId && !resources.modifier)
    ) {
      throw new NotFoundError(
        "Menu item, station, or modifier option not found",
      );
    }
    if (
      resources.item.branchId &&
      resources.item.branchId !== resources.station.branchId
    ) {
      throw new ValidationError(
        "Station branch does not match the menu item branch",
      );
    }
    return stationRepository.setRoute(
      menuItemId,
      input.stationId,
      input.modifierOptionId,
    );
  },
  async removeRoute(
    auth: AuthContext,
    menuItemId: string,
    modifierOptionId?: string | null,
  ) {
    requirePermission(auth, "menu:update");
    return stationRepository.removeRoute(
      auth.tenantId,
      menuItemId,
      modifierOptionId,
    );
  },
};
