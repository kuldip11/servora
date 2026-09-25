import { createMenuApi, type MenuScheduleInput } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
export type ScheduleFormInput = MenuScheduleInput;

export const menuSchedulesService = {
  list: menuApi.listSchedules,
  add: menuApi.addSchedule,
  remove: menuApi.removeSchedule,
  listMenuSchedules: <T>(menuId: string) =>
    menuApi.listMenuSchedules<T>(menuId),
  createMenuSchedule: <T>(menuId: string, input: Record<string, unknown>) =>
    menuApi.createMenuSchedule<T>(menuId, input),
  removeMenuSchedule: menuApi.removeMenuSchedule,
};
