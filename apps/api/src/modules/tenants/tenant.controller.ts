import type { AuthContext } from "@/core/auth";
import {
  createdResponse,
  successResponse,
} from "@/core/response/response-helpers";
import type { CreateTenantRequest, UpdateTenantRequest } from "@pos/contracts";
import { tenantService } from "./tenant.service";
import {
  toAvailableTenantResponse,
  toTenantCreatedResponse,
  toTenantResponse,
} from "./tenant.mapper";

export const tenantController = {
  async list(auth: AuthContext) {
    return successResponse(
      (await tenantService.list(auth)).map(toAvailableTenantResponse),
    );
  },
  async create(auth: AuthContext, input: CreateTenantRequest) {
    return createdResponse(
      toTenantCreatedResponse(await tenantService.create(auth, input)),
    );
  },
  async update(
    auth: AuthContext,
    tenantId: string,
    changes: UpdateTenantRequest,
  ) {
    return successResponse(
      toTenantResponse(await tenantService.update(auth, tenantId, changes)),
    );
  },
  async archive(auth: AuthContext, tenantId: string) {
    return successResponse(
      toTenantResponse(await tenantService.archive(auth, tenantId)),
    );
  },
};
