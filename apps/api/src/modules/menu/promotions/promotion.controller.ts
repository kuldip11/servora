import type { AuthContext } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import {
  toPromotionPreviewResponse,
  toPromotionResponse,
} from "./promotion.mapper";
import {
  promotionService,
  type PromotionInput,
  type PromotionPreviewInput,
} from "./promotion.service";
export const promotionController = {
  async preview(auth: AuthContext, input: PromotionPreviewInput) {
    return successResponse(
      toPromotionPreviewResponse(await promotionService.preview(auth, input)),
    );
  },
  async list(auth: AuthContext) {
    return successResponse(
      (await promotionService.list(auth)).map(toPromotionResponse),
    );
  },
  async create(auth: AuthContext, input: PromotionInput) {
    return createdResponse(
      toPromotionResponse(await promotionService.create(auth, input)),
    );
  },
  async update(auth: AuthContext, id: string, input: Partial<PromotionInput>) {
    return successResponse(
      toPromotionResponse(await promotionService.update(auth, id, input)),
    );
  },
  async remove(auth: AuthContext, id: string) {
    await promotionService.remove(auth, id);
    return successResponse(null);
  },
  async stats(auth: AuthContext, id: string) {
    return successResponse(await promotionService.stats(auth, id));
  },
};
