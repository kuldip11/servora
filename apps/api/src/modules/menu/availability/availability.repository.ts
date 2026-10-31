import { availabilityChannelRepository } from "./availability-channel.repository";
import { availabilityDashboardRepository } from "./availability-dashboard.repository";
import { availabilityOverrideRepository } from "./availability-override.repository";
import { availabilityScheduleRepository } from "./availability-schedule.repository";
import { availabilityStateRepository } from "./availability-state.repository";

export const availabilityRepository = {
  ...availabilityDashboardRepository,
  ...availabilityStateRepository,
  ...availabilityChannelRepository,
  ...availabilityScheduleRepository,
  ...availabilityOverrideRepository,
};
