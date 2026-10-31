import { availabilityDashboardService } from "./availability-dashboard.service";
import { availabilityEffectiveService } from "./availability-effective.service";
import { availabilityInventoryService } from "./availability-inventory.service";
import { availabilityOverrideService } from "./availability-override.service";
import { availabilityScheduleService } from "./availability-schedule.service";

export type {
  AvailabilityChannel,
  AvailabilityContext,
  AvailabilityFulfillmentType,
  AvailabilityReplayEvidence,
  AvailabilityReplayItem,
  AvailabilityReplayOverride,
} from "./availability.types";
export type {
  CreateScheduleInput,
  UpdateScheduleInput,
} from "./availability-schedule.service";
export type {
  ManualOverrideInput,
  UpsertChannelOverrideInput,
  UpsertOverrideInput,
} from "./availability-override.service";

export const availabilityService = {
  getUnavailableDashboard: availabilityDashboardService.getUnavailableDashboard,
  ...availabilityInventoryService,
  ...availabilityScheduleService,
  ...availabilityOverrideService,
  ...availabilityEffectiveService,
};
