import type { AuthContext } from "@/core/auth";
import {
  createdResponse,
  successResponse,
} from "@/core/response/response-helpers";
import type {
  CreateOrganizationRequest,
  LoyaltyTierRequest,
  OrganizationMenuRequest,
  UpdateLoyaltyTierRequest,
  UpdateOrganizationMenuRequest,
  UpdateOrganizationRequest,
} from "@pos/contracts";
import { toLoyaltyTierResponse } from "@/modules/loyalty/loyalty.mapper";
import { toTenantResponse } from "@/modules/tenants/tenant.mapper";
import {
  toOrganizationCreatedResponse,
  toOrganizationMenuResponse,
  toOrganizationResponse,
} from "./organization.mapper";
import { organizationService } from "./organization.service";

export const organizationController = {
  async listLoyaltyTiers(auth: AuthContext, organizationId: string) {
    return successResponse(
      (await organizationService.listLoyaltyTiers(auth, organizationId)).map(
        toLoyaltyTierResponse,
      ),
    );
  },
  async createLoyaltyTier(
    auth: AuthContext,
    organizationId: string,
    input: LoyaltyTierRequest,
  ) {
    return createdResponse(
      toLoyaltyTierResponse(
        await organizationService.createLoyaltyTier(
          auth,
          organizationId,
          input,
        ),
      ),
    );
  },
  async updateLoyaltyTier(
    auth: AuthContext,
    organizationId: string,
    tierId: string,
    input: UpdateLoyaltyTierRequest,
  ) {
    return successResponse(
      toLoyaltyTierResponse(
        await organizationService.updateLoyaltyTier(
          auth,
          organizationId,
          tierId,
          input,
        ),
      ),
    );
  },
  async deleteLoyaltyTier(
    auth: AuthContext,
    organizationId: string,
    tierId: string,
  ) {
    await organizationService.deleteLoyaltyTier(auth, organizationId, tierId);
    return successResponse(null);
  },
  async list(auth: AuthContext) {
    return successResponse(
      (await organizationService.list(auth)).map(toOrganizationResponse),
    );
  },
  async create(auth: AuthContext, input: CreateOrganizationRequest) {
    return createdResponse(
      toOrganizationCreatedResponse(
        await organizationService.create(auth, input),
      ),
    );
  },
  async update(
    auth: AuthContext,
    organizationId: string,
    changes: UpdateOrganizationRequest,
  ) {
    return successResponse(
      toOrganizationResponse(
        await organizationService.update(auth, organizationId, changes),
      ),
    );
  },
  async listTenants(auth: AuthContext, organizationId: string) {
    return successResponse(
      (await organizationService.listTenants(auth, organizationId)).map(
        toTenantResponse,
      ),
    );
  },
  async listMenus(auth: AuthContext, organizationId: string) {
    return successResponse(
      (await organizationService.listMenus(auth, organizationId)).map(
        toOrganizationMenuResponse,
      ),
    );
  },
  async createMenu(
    auth: AuthContext,
    organizationId: string,
    input: OrganizationMenuRequest,
  ) {
    return createdResponse(
      toOrganizationMenuResponse(
        await organizationService.createMenu(auth, organizationId, input),
      ),
    );
  },
  async updateMenu(
    auth: AuthContext,
    organizationId: string,
    menuId: string,
    input: UpdateOrganizationMenuRequest,
  ) {
    return successResponse(
      toOrganizationMenuResponse(
        await organizationService.updateMenu(
          auth,
          organizationId,
          menuId,
          input,
        ),
      ),
    );
  },
  async deleteMenu(auth: AuthContext, organizationId: string, menuId: string) {
    await organizationService.deleteMenu(auth, organizationId, menuId);
    return successResponse(null);
  },
  async archive(auth: AuthContext, organizationId: string) {
    return successResponse(
      toOrganizationResponse(
        await organizationService.archive(auth, organizationId),
      ),
    );
  },
};
