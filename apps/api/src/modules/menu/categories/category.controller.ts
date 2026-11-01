import type { AuthContext } from "@/core/auth";
import { successResponse, createdResponse } from "@/core/response";
import {
  categoryService,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from "./category.service";
import { toMenuCategoryResponse } from "./category.mapper";

export const categoryController = {
  async list(auth: AuthContext) {
    const categories = await categoryService.list(auth);
    return successResponse(categories.map(toMenuCategoryResponse));
  },

  async create(auth: AuthContext, input: CreateCategoryInput) {
    const category = await categoryService.create(auth, input);
    return createdResponse(toMenuCategoryResponse(category));
  },

  async update(
    auth: AuthContext,
    categoryId: string,
    input: UpdateCategoryInput,
  ) {
    const category = await categoryService.update(auth, categoryId, input);
    return successResponse(toMenuCategoryResponse(category));
  },

  async deactivate(auth: AuthContext, categoryId: string) {
    await categoryService.deactivate(auth, categoryId);
    return successResponse(null);
  },
};
