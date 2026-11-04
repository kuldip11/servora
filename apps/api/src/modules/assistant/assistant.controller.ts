import type { AssistantQuestion } from "@pos/contracts";
import { successResponse } from "@/core/response";
import { assistantService } from "./assistant.service";

export const assistantController = {
  async capabilities(token: string) {
    return successResponse(await assistantService.capabilities(token));
  },

  async ask(token: string, question: AssistantQuestion, signal?: AbortSignal) {
    return successResponse(await assistantService.ask(token, question, signal));
  },
};
