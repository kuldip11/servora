import type { AuthContext } from "@/core/auth";
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from "@/core/response";
import {
  inventoryService,
  type CreateInventoryItemInput,
  type UpdateStockInput,
} from "./inventory.service";
import {
  toInventoryItemResponse,
  toInventoryTransactionResponse,
  toWasteReasonResponse,
} from "./inventory.mapper";

export const inventoryController = {
  async list(
    auth: AuthContext,
    filters: {
      page?: number;
      limit?: number;
      search?: string;
      lowStockOnly?: boolean;
    } = {},
  ) {
    const result = await inventoryService.list(auth, filters);
    return paginatedResponse(result.items.map(toInventoryItemResponse), {
      page: result.page,
      limit: result.limit,
      total: result.total,
    });
  },

  async create(auth: AuthContext, input: CreateInventoryItemInput) {
    const item = await inventoryService.create(auth, input);
    return createdResponse(toInventoryItemResponse(item));
  },

  async updateStock(
    auth: AuthContext,
    itemId: string,
    input: UpdateStockInput,
  ) {
    const result = await inventoryService.updateStock(auth, itemId, input);
    return successResponse({
      item: toInventoryItemResponse(result.item),
      transaction: toInventoryTransactionResponse({
        ...result.transaction,
        inventoryItem: result.item,
        performedByUser: null,
        wasteReason: null,
      }),
    });
  },

  async lowStockAlerts(auth: AuthContext) {
    const items = await inventoryService.lowStockAlerts(auth);
    return successResponse(items.map(toInventoryItemResponse));
  },

  async recentTransactions(auth: AuthContext) {
    const transactions = await inventoryService.recentTransactions(auth);
    return successResponse(transactions.map(toInventoryTransactionResponse));
  },

  async recipeImpact(auth: AuthContext, itemId: string) {
    return successResponse(
      await inventoryService.getRecipeImpact(auth, itemId),
    );
  },

  async listWasteReasons(auth: AuthContext, includeInactive = false) {
    return successResponse(
      (await inventoryService.listWasteReasons(auth, includeInactive)).map(
        toWasteReasonResponse,
      ),
    );
  },

  async createWasteReason(auth: AuthContext, input: { label: string }) {
    return createdResponse(
      toWasteReasonResponse(
        await inventoryService.createWasteReason(auth, input.label),
      ),
    );
  },

  async updateWasteReason(
    auth: AuthContext,
    id: string,
    input: { label?: string | undefined; isActive?: boolean | undefined },
  ) {
    return successResponse(
      toWasteReasonResponse(
        await inventoryService.updateWasteReason(auth, id, input),
      ),
    );
  },

  async logWaste(
    auth: AuthContext,
    itemId: string,
    input: {
      quantity: number;
      wasteReasonId: string;
      notes?: string | undefined;
    },
  ) {
    const result = await inventoryService.logWaste(auth, itemId, input);
    return successResponse({
      item: toInventoryItemResponse(result.item),
      transaction: toInventoryTransactionResponse({
        ...result.transaction,
        inventoryItem: result.item,
        performedByUser: null,
        wasteReason: null,
      }),
    });
  },
};
