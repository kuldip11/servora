import { createMenuApi, type MenuAllergenDto } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

export const menuAllergensService = {
  async list(): Promise<MenuAllergenDto[]> {
    return menuApi.listAllergens();
  },
};
