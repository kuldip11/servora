import { itemNotFound } from "./availability.errors";
import { availabilityRepository } from "./availability.repository";
import { resolveEffectiveAvailability } from "./availability-resolution";
import { availabilityScheduleService } from "./availability-schedule.service";
import type {
  AvailabilityContext,
  AvailabilityReplayEvidence,
} from "./availability.types";

export const availabilityEffectiveService = {
  async getEffectiveItemWithEvidence(
    tenantId: string,
    itemId: string,
    branchId: string,
    context: AvailabilityContext,
  ) {
    let evidence: AvailabilityReplayEvidence;

    if (context.historicalReplay) {
      evidence = context.historicalReplay;
      if (evidence.item.id !== itemId) throw itemNotFound(itemId);
    } else {
      const item = await availabilityRepository.findFullItem(tenantId, itemId);
      if (!item) throw itemNotFound(itemId);

      const [resolvedStatus, override, channelOverride] = await Promise.all([
        availabilityScheduleService.getEffectiveStatus(
          tenantId,
          itemId,
          branchId,
          context,
        ),
        item.branchId === null
          ? availabilityRepository.getOverride(tenantId, itemId, branchId)
          : Promise.resolve(undefined),
        context.channel !== "UNSCOPED" && context.fulfillmentType !== "UNSCOPED"
          ? availabilityRepository.getChannelOverride(
              tenantId,
              itemId,
              context.channel,
              context.fulfillmentType,
            )
          : Promise.resolve(undefined),
      ]);
      evidence = {
        item,
        resolvedStatus,
        branchOverride: override
          ? {
              status: override.status,
              price: override.price,
              taxRate: override.taxRate,
              prepTimeMinutes: override.prepTimeMinutes,
              isHidden: override.isHidden,
              availabilityReason: override.availabilityReason,
            }
          : null,
        channelOverride: channelOverride
          ? {
              status: channelOverride.status,
              isHidden: channelOverride.isHidden,
              availabilityReason: channelOverride.availabilityReason,
            }
          : null,
      };
    }

    return {
      evidence,
      effective: resolveEffectiveAvailability(evidence),
    };
  },

  async getEffectiveItem(
    tenantId: string,
    itemId: string,
    branchId: string,
    context: AvailabilityContext,
  ) {
    return (
      await availabilityEffectiveService.getEffectiveItemWithEvidence(
        tenantId,
        itemId,
        branchId,
        context,
      )
    ).effective;
  },
};
