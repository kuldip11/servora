import { toApiClientError } from "./api-error";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

export const extractApiError = (error: unknown, fallback?: string): string => {
  const normalized = toApiClientError(error);
  const message =
    fallback &&
    normalized.code === "UNEXPECTED_ERROR" &&
    !(error instanceof Error)
      ? fallback
      : normalized.message || fallback || DEFAULT_ERROR_MESSAGE;
  const shouldShowReference =
    Boolean(normalized.requestId) &&
    (normalized.status === undefined ||
      normalized.status >= 500 ||
      normalized.code === "INTERNAL_ERROR" ||
      normalized.code === "SERVICE_UNAVAILABLE");

  return shouldShowReference
    ? `${message} (Reference: ${normalized.requestId})`
    : message;
};

export const extractApiFieldErrors = (error: unknown) =>
  toApiClientError(error).fieldErrors ?? {};

export const isRetryableApiError = (error: unknown) =>
  toApiClientError(error).retryable;
