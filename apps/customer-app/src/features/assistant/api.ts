import type { AssistantQuestion, AssistantReply } from "@pos/contracts";
import { request } from "@/shared/api/client";
export const getAssistantCapabilities = (token: string, signal?: AbortSignal) =>
  request<{ enabled: boolean }>(
    "/api/customer/assistant/capabilities",
    signal ? { signal } : undefined,
    token,
  );
export const askAssistant = (
  token: string,
  question: AssistantQuestion,
  signal?: AbortSignal,
) =>
  request<AssistantReply>(
    "/api/customer/assistant/messages",
    {
      method: "POST",
      body: JSON.stringify(question),
      ...(signal ? { signal } : {}),
    },
    token,
  );
