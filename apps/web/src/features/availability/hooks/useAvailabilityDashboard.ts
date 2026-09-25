import { useQuery } from "@tanstack/react-query";
import { availabilityDashboardQuery } from "@/features/availability/query-options";

export const useAvailabilityDashboard = (input: {
  channel: string;
  fulfillmentType: string;
  cause?: string;
}) => useQuery(availabilityDashboardQuery(input));
