import type { AppError } from "./app-error";

export type ApiFieldErrors = Record<string, string[]>;

export interface ApiErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
  requestId: string;
  fieldErrors?: ApiFieldErrors;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/;

const normalizeResourceCode = (resource: string): string =>
  resource
    .replace(/\bwith\s+id\b.*$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();

export const publicCodeForAppError = (error: AppError): string => {
  const reason = error.details?.["reason"];
  if (typeof reason === "string" && CODE_PATTERN.test(reason)) return reason;

  if (error.code === "NOT_FOUND") {
    const resource = error.details?.["resource"];
    if (typeof resource === "string") {
      const normalized = normalizeResourceCode(resource);
      if (normalized) return `${normalized}_NOT_FOUND`;
    }
    return "RESOURCE_NOT_FOUND";
  }

  return error.code;
};

const asFieldErrors = (value: unknown): ApiFieldErrors | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const result: ApiFieldErrors = {};
  for (const [field, messages] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(messages)) {
      const clean = messages.filter((message): message is string => typeof message === "string" && message.trim().length > 0);
      if (clean.length) result[field] = clean;
    } else if (typeof messages === "string" && messages.trim()) {
      result[field] = [messages];
    }
  }
  return Object.keys(result).length ? result : undefined;
};

export const fieldErrorsForAppError = (error: AppError): ApiFieldErrors | undefined => {
  const explicit = asFieldErrors(error.details?.["fieldErrors"]);
  if (explicit) return explicit;
  const field = error.details?.["field"];
  if (typeof field === "string" && field.trim()) return { [field]: [error.message] };
  return undefined;
};


export const publicMessageForAppError = (error: AppError): string => {
  if (error.code === "NOT_FOUND") {
    const resource = error.details?.["resource"];
    return typeof resource === "string" && resource.trim()
      ? `${resource} was not found.`
      : "The requested information was not found.";
  }
  return error.message;
};

export const isRetryableStatus = (statusCode: number): boolean =>
  statusCode === 408 || statusCode === 429 || statusCode >= 500;

export const createApiErrorResponse = (input: {
  code: string;
  message: string;
  statusCode: number;
  requestId: string;
  fieldErrors?: ApiFieldErrors;
}): ApiErrorResponse => ({
  success: false,
  error: {
    code: input.code,
    message: input.message,
    retryable: isRetryableStatus(input.statusCode),
    requestId: input.requestId,
    ...(input.fieldErrors ? { fieldErrors: input.fieldErrors } : {}),
  },
});

export const serializeAppError = (error: AppError, requestId: string): ApiErrorResponse => {
  const fieldErrors = fieldErrorsForAppError(error);
  return createApiErrorResponse({
    code: publicCodeForAppError(error),
    message: publicMessageForAppError(error),
    statusCode: error.statusCode,
    requestId,
    ...(fieldErrors ? { fieldErrors } : {}),
  });
};
