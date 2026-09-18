import { isRetryableApiError } from "@pos/api-client";
import { toast } from "@pos/ui";
import { getErrorMessage } from "./errors";

export const notifyError = (error: unknown, fallback?: string): void => {
  const retryable = isRetryableApiError(error);
  toast({
    title: getErrorMessage(error, fallback),
    ...(retryable
      ? { description: "This may be temporary. Please try again." }
      : {}),
    tone: "danger",
  });
};

export const notifySuccess = (message: string): void => {
  toast({ title: message, tone: "success" });
};
