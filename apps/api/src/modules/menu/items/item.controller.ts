import type { MenuItemStatus } from "@pos/types";
import type { AuthContext } from "@/core/auth";
import { successResponse, createdResponse } from "@/core/response";
import { toMenuItemResponse } from "./item.mapper";
import {
  itemService,
  type CreateItemInput,
  type UpdateItemInput,
  type DuplicateItemInput,
} from "./item.service";

export const itemController = {
  async getById(auth: AuthContext, itemId: string) {
    const item = await itemService.getById(auth, itemId);
    return successResponse(toMenuItemResponse(item));
  },

  async create(auth: AuthContext, input: CreateItemInput) {
    const item = await itemService.create(auth, input);
    return createdResponse(toMenuItemResponse(item));
  },

  async update(auth: AuthContext, itemId: string, input: UpdateItemInput) {
    const item = await itemService.update(auth, itemId, input);
    return successResponse(toMenuItemResponse(item));
  },

  async remove(auth: AuthContext, itemId: string) {
    await itemService.remove(auth, itemId);
    return successResponse(null);
  },

  async duplicate(
    auth: AuthContext,
    itemId: string,
    input: DuplicateItemInput,
  ) {
    const copy = await itemService.duplicate(auth, itemId, input);
    return createdResponse(toMenuItemResponse(copy));
  },

  async publish(auth: AuthContext, itemId: string) {
    const item = await itemService.publish(auth, itemId);
    return successResponse(toMenuItemResponse(item));
  },

  async unpublish(auth: AuthContext, itemId: string) {
    const item = await itemService.unpublish(auth, itemId);
    return successResponse(toMenuItemResponse(item));
  },

  async updateStatus(
    auth: AuthContext,
    itemId: string,
    status: MenuItemStatus,
    reason: string | undefined,
  ) {
    const item = await itemService.updateStatus(auth, itemId, status, reason);
    return successResponse(toMenuItemResponse(item));
  },

  async updateAvailability(
    auth: AuthContext,
    itemId: string,
    isAvailable: boolean,
    reason: string | undefined,
  ) {
    const item = await itemService.updateAvailability(
      auth,
      itemId,
      isAvailable,
      reason,
    );
    return successResponse(toMenuItemResponse(item));
  },

  async listByStatus(
    auth: AuthContext,
    status: MenuItemStatus,
    categoryId: string | undefined,
  ) {
    const items = await itemService.listByStatus(auth, [status], categoryId);
    return successResponse(items.map(toMenuItemResponse));
  },
};
