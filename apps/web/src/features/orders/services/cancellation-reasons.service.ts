import type { CancellationReason } from "@pos/types";
import { createOrdersApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const ordersApi = createOrdersApi(apiClient);

export const cancellationReasonsService = {
  async list(
    activeOnly = true,
    signal?: AbortSignal,
  ): Promise<CancellationReason[]> {
    return activeOnly
      ? ordersApi.listCancellationReasons(signal)
      : ordersApi.listAllCancellationReasons(signal);
  },
  async listAll(signal?: AbortSignal): Promise<CancellationReason[]> {
    return ordersApi.listAllCancellationReasons(signal);
  },
  async create(label: string): Promise<CancellationReason> {
    return ordersApi.createCancellationReason(label);
  },
  async update(
    id: string,
    patch: { label?: string; isActive?: boolean },
  ): Promise<CancellationReason> {
    return ordersApi.updateCancellationReason(id, patch);
  },
};
