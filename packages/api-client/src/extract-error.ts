import { toApiClientError } from "./api-error";

const GENERIC_MESSAGES = new Set([
  "An unexpected error occurred.",
  "The request could not be completed.",
]);

export const extractApiError = (
  error: unknown,
  fallback?: string,
): string => {
  const normalized = toApiClientError(error);
  return fallback && GENERIC_MESSAGES.has(normalized.message)
    ? fallback
    : normalized.message;
};
