import { useQuery } from "@tanstack/react-query";
import { dashboardStatsQuery } from "@/features/analytics/query-options";

export const useDashboardStats = () => useQuery(dashboardStatsQuery());
