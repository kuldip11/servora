import type { MenuItemStatus, OrderType } from "@pos/types";
import {
  branchNotFoundForOverride,
  itemNotFound,
  itemNotTenantWide,
  manualOverrideReasonRequired,
} from "./availability.errors";
import { availabilityRepository } from "./availability.repository";

export interface ManualOverrideInput {
  status: MenuItemStatus;
  reason: string;
}

export interface UpsertOverrideInput {
  price?: number | null | undefined;
  taxRate?: number | null | undefined;
  prepTimeMinutes?: number | null | undefined;
  status?: MenuItemStatus | null | undefined;
  isHidden?: boolean | undefined;
  availabilityReason?: string | null | undefined;
}

export interface UpsertChannelOverrideInput {
  channel: "STAFF" | "CUSTOMER_QR";
  fulfillmentType?: OrderType | null | undefined;
  status?: MenuItemStatus | null | undefined;
  isHidden?: boolean | undefined;
  availabilityReason?: string | null | undefined;
}

export const availabilityOverrideService = {
  async setManualOverride(
    tenantId: string,
    itemId: string,
    input: ManualOverrideInput,
    userId: string,
  ) {
    const item = await availabilityRepository.findItemBasics(tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    const reason = input.reason.trim();
    if (!reason) throw manualOverrideReasonRequired();
    return availabilityRepository.setManualOverride(
      tenantId,
      itemId,
      input.status,
      reason,
      userId,
    );
  },

  async clearManualOverride(tenantId: string, itemId: string) {
    const item = await availabilityRepository.findItemBasics(tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    return availabilityRepository.clearManualOverride(tenantId, itemId);
  },

  async listOverridesForItem(tenantId: string, itemId: string) {
    return availabilityRepository.listOverridesForItem(tenantId, itemId);
  },

  async upsertOverride(
    tenantId: string,
    itemId: string,
    branchId: string,
    input: UpsertOverrideInput,
  ) {
    const item = await availabilityRepository.findItemBasics(tenantId, itemId);
    if (!item) throw itemNotFound(itemId);
    if (item.branchId !== null) throw itemNotTenantWide();

    const branch = await availabilityRepository.findBranch(tenantId, branchId);
    if (!branch) throw branchNotFoundForOverride(branchId);

    return availabilityRepository.upsertOverride(tenantId, itemId, branchId, {
      price: input.price != null ? String(input.price) : null,
      taxRate: input.taxRate != null ? String(input.taxRate) : null,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      status: input.status ?? null,
      isHidden: input.isHidden ?? false,
      availabilityReason: input.availabilityReason ?? null,
    });
  },

  async deleteOverride(
    tenantId: string,
    itemId: string,
    branchId: string,
  ): Promise<void> {
    await availabilityRepository.deleteOverride(tenantId, itemId, branchId);
  },

  async listChannelOverrides(tenantId: string, itemId: string) {
    return availabilityRepository.listChannelOverrides(tenantId, itemId);
  },

  async upsertChannelOverride(
    tenantId: string,
    itemId: string,
    input: UpsertChannelOverrideInput,
  ) {
    if (!(await availabilityRepository.findItemBasics(tenantId, itemId)))
      throw itemNotFound(itemId);
    return availabilityRepository.upsertChannelOverride(
      tenantId,
      itemId,
      input.channel,
      input.fulfillmentType ?? null,
      {
        status: input.status ?? null,
        isHidden: input.isHidden ?? false,
        availabilityReason: input.availabilityReason ?? null,
      },
    );
  },

  async deleteChannelOverride(tenantId: string, id: string) {
    await availabilityRepository.deleteChannelOverride(tenantId, id);
  },
};
