import axios from "axios";

export type ApiFieldErrors = Record<string, string[]>;

export interface ApiClientError {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
  fieldErrors?: ApiFieldErrors;
  status?: number;
}

interface ErrorEnvelope {
  success?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
    requestId?: unknown;
    fieldErrors?: unknown;
  };
  // Temporary compatibility with API responses produced before the unified
  // envelope was introduced.
  code?: unknown;
  message?: unknown;
}

const fieldErrors = (value: unknown): ApiFieldErrors | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const result: ApiFieldErrors = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(raw)) {
      const messages = raw.filter(
        (item): item is string => typeof item === "string",
      );
      if (messages.length) result[key] = messages;
    }
  }
  return Object.keys(result).length ? result : undefined;
};


export class ApiClientErrorException extends Error implements ApiClientError {
  readonly code: string;
  readonly retryable: boolean;
  readonly requestId?: string;
  readonly fieldErrors?: ApiFieldErrors;
  readonly status?: number;

  constructor(error: ApiClientError) {
    super(error.message);
    this.name = "ApiClientErrorException";
    this.code = error.code;
    this.retryable = error.retryable;
    this.requestId = error.requestId;
    this.fieldErrors = error.fieldErrors;
    this.status = error.status;
  }
}

export const apiClientErrorFromResponse = (
  body: unknown,
  status: number,
  fallback = "The request could not be completed.",
): ApiClientError => {
  const data = body as ErrorEnvelope | undefined;
  const nested = data?.error;
  if (nested && typeof nested === "object") {
    const normalizedFieldErrors = fieldErrors(nested.fieldErrors);
    return {
      code: typeof nested.code === "string" ? nested.code : "REQUEST_FAILED",
      message:
        typeof nested.message === "string" && nested.message.trim()
          ? nested.message
          : fallback,
      retryable:
        typeof nested.retryable === "boolean"
          ? nested.retryable
          : status === 408 || status === 429 || status >= 500,
      ...(typeof nested.requestId === "string"
        ? { requestId: nested.requestId }
        : {}),
      ...(normalizedFieldErrors ? { fieldErrors: normalizedFieldErrors } : {}),
      status,
    };
  }

  return {
    code: typeof data?.code === "string" ? data.code : "REQUEST_FAILED",
    message:
      typeof data?.message === "string" && data.message.trim()
        ? data.message
        : fallback,
    retryable: status === 408 || status === 429 || status >= 500,
    status,
  };
};

export const toApiClientError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientErrorException) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      ...(error.requestId ? { requestId: error.requestId } : {}),
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      ...(typeof error.status === "number" ? { status: error.status } : {}),
    };
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ErrorEnvelope | undefined;
    const nested = data?.error;
    if (nested && typeof nested === "object") {
      const normalizedFieldErrors = fieldErrors(nested.fieldErrors);
      return {
        code: typeof nested.code === "string" ? nested.code : "REQUEST_FAILED",
        message:
          typeof nested.message === "string" && nested.message.trim()
            ? nested.message
            : "The request could not be completed.",
        retryable: nested.retryable === true,
        ...(typeof nested.requestId === "string"
          ? { requestId: nested.requestId }
          : {}),
        ...(normalizedFieldErrors
          ? { fieldErrors: normalizedFieldErrors }
          : {}),
        ...(typeof error.response?.status === "number"
          ? { status: error.response.status }
          : {}),
      };
    }

    return {
      code: typeof data?.code === "string" ? data.code : "REQUEST_FAILED",
      message:
        typeof data?.message === "string" && data.message.trim()
          ? data.message
          : error.message || "The request could not be completed.",
      retryable:
        !error.response ||
        error.response.status >= 500 ||
        error.response.status === 429,
      ...(typeof error.response?.status === "number"
        ? { status: error.response.status }
        : {}),
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNEXPECTED_ERROR",
      message: error.message || "An unexpected error occurred.",
      retryable: false,
    };
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: "An unexpected error occurred.",
    retryable: false,
  };
};
