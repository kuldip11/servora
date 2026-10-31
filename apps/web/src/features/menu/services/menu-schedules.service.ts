import { createMenuApi, type MenuScheduleInput } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
export type ScheduleFormInput = MenuScheduleInput;

export const menuSchedulesService = {
  list: menuApi.listSchedules,
  add: menuApi.addSchedule,
  remove: menuApi.removeSchedule,
  listMenuSchedules: (menuId: string) => menuApi.listMenuSchedules(menuId),
  createMenuSchedule: (
    menuId: string,
    input: Parameters<typeof menuApi.createMenuSchedule>[1],
  ) => menuApi.createMenuSchedule(menuId, input),
  removeMenuSchedule: menuApi.removeMenuSchedule,
};
