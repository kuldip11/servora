import { useQuery } from "@tanstack/react-query";
import { menuEngineeringQuery } from "@/features/analytics/query-options";

export const useMenuEngineering = (windowDays: number) =>
  useQuery(menuEngineeringQuery(windowDays));
