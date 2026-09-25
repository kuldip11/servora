import { createSettingsApi } from "@pos/api-client";
import type { Tenant } from "@pos/types";
import { apiClient } from "@/shared/lib/api-client";

const settingsApi = createSettingsApi(apiClient);

export type TenantSettings = Required<
  Pick<
    Tenant,
    | "id"
    | "serviceChargePercent"
    | "serviceChargeTaxable"
    | "roundingPolicy"
    | "defaultTaxMode"
    | "courseSequencingEnabled"
  >
>;

export type TenantSettingsUpdate = {
  serviceChargePercent?: number | null;
  serviceChargeTaxable?: TenantSettings["serviceChargeTaxable"];
  roundingPolicy?: TenantSettings["roundingPolicy"];
  defaultTaxMode?: TenantSettings["defaultTaxMode"];
  courseSequencingEnabled?: TenantSettings["courseSequencingEnabled"];
};

export const settingsService = {
  async getTenant(
    tenantId: string,
    signal?: AbortSignal,
  ): Promise<TenantSettings> {
    const memberships = await settingsApi.tenants<TenantSettings>(signal);
    const tenant = memberships.find(
      (entry) => entry.tenant.id === tenantId,
    )?.tenant;
    if (!tenant) throw new Error("Active tenant settings are unavailable");
    return tenant;
  },
  updateTenant(tenantId: string, input: TenantSettingsUpdate) {
    return settingsApi.updateTenant<TenantSettings>(tenantId, input);
  },
};
