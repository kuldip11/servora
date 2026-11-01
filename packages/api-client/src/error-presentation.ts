import { toApiClientError } from "./api-error";

export type ApiErrorUiKind =
  | "authentication"
  | "permission"
  | "not-found"
  | "conflict"
  | "rate-limit"
  | "timeout"
  | "network"
  | "server"
  | "validation"
  | "business"
  | "unexpected";

export interface ApiErrorUiPresentation {
  kind: ApiErrorUiKind;
  title: string;
  message: string;
  retryable: boolean;
  requestReference?: string;
}

const statusTitle = (kind: ApiErrorUiKind): string => {
  switch (kind) {
    case "authentication":
      return "Session expired";
    case "permission":
      return "Permission denied";
    case "not-found":
      return "Not found";
    case "conflict":
      return "This data changed";
    case "rate-limit":
      return "Too many requests";
    case "timeout":
      return "Request timed out";
    case "network":
      return "Connection problem";
    case "server":
      return "Service unavailable";
    case "validation":
      return "Please review the form";
    case "business":
      return "Action could not be completed";
    case "unexpected":
      return "Something went wrong";
  }
};

export const classifyApiErrorForUi = (
  error: unknown,
): ApiErrorUiPresentation => {
  const normalized = toApiClientError(error);
  const status = normalized.status;
  const code = normalized.code.toUpperCase();
  let kind: ApiErrorUiKind;

  if (status === 401) kind = "authentication";
  else if (status === 403) kind = "permission";
  else if (status === 404) kind = "not-found";
  else if (status === 409) kind = "conflict";
  else if (status === 429) kind = "rate-limit";
  else if (status === 408 || code.includes("TIMEOUT")) kind = "timeout";
  else if (status === undefined && normalized.retryable) kind = "network";
  else if (typeof status === "number" && status >= 500) kind = "server";
  else if (
    status === 400 &&
    (normalized.fieldErrors || code.includes("VALIDATION"))
  )
    kind = "validation";
  else if (typeof status === "number" && status >= 400) kind = "business";
  else kind = "unexpected";

  const supportRelevant =
    Boolean(normalized.requestId) &&
    (kind === "server" || kind === "unexpected");

  return {
    kind,
    title: statusTitle(kind),
    message: normalized.message,
    retryable: normalized.retryable,
    ...(supportRelevant && normalized.requestId
      ? { requestReference: normalized.requestId }
      : {}),
  };
};
