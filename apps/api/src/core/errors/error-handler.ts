import { randomUUID } from "node:crypto";
import { AppError } from "./app-error";
import { createApiErrorResponse, serializeAppError, type ApiFieldErrors } from "./error-response";
import { mapDatabaseError } from "./database-error-mapper";
import { rootLogger } from "../logger";
import type { RequestContext } from "../context/request-context";

const cleanPath = (path: string): string =>
  path
    .replace(/^\//, "")
    .replace(/\//g, ".")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^body\./, "");

const validationFieldErrors = (error: unknown): ApiFieldErrors | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { all?: unknown; value?: unknown };
  if (!Array.isArray(candidate.all)) return undefined;
  const result: ApiFieldErrors = {};
  for (const issue of candidate.all) {
    if (!issue || typeof issue !== "object") continue;
    const row = issue as { path?: unknown; message?: unknown; summary?: unknown };
    const rawPath = typeof row.path === "string" ? row.path : "request";
    const field = cleanPath(rawPath) || "request";
    const message =
      typeof row.summary === "string" && row.summary.trim()
        ? row.summary
        : typeof row.message === "string" && row.message.trim()
          ? row.message
          : "Please enter a valid value.";
    (result[field] ??= []).push(message);
  }
  return Object.keys(result).length ? result : undefined;
};

const requestIdFromContext = (context: Record<string, unknown>): string => {
  const requestContext = context["requestContext"] as RequestContext | undefined;
  if (requestContext?.requestId) return requestContext.requestId;
  const request = context["request"];
  if (request instanceof Request) {
    const header = request.headers.get("x-request-id");
    if (header?.trim()) return header;
  }
  return randomUUID();
};

export const handleApiError = (context: Record<string, unknown>) => {
  const code = String(context["code"] ?? "UNKNOWN");
  const error = context["error"];
  const set = context["set"] as { status?: number | string };
  const requestId = requestIdFromContext(context);

  const appError = AppError.unwrap(error) ?? mapDatabaseError(error);
  if (appError) {
    rootLogger.warn(`API Error: ${appError.code}`, {
      requestId,
      statusCode: appError.statusCode,
      publicCode: appError.details?.["reason"] ?? appError.code,
      message: appError.message,
      details: appError.details,
    });
    set.status = appError.statusCode;
    return serializeAppError(appError, requestId);
  }

  if (code === "PARSE") {
    set.status = 400;
    return createApiErrorResponse({
      code: "MALFORMED_REQUEST",
      message: "The request body could not be read. Please check the submitted data and try again.",
      statusCode: 400,
      requestId,
    });
  }

  if (code === "VALIDATION") {
    set.status = 400;
    const fieldErrors = validationFieldErrors(error);
    return createApiErrorResponse({
      code: "VALIDATION_FAILED",
      message: "Please check the information you entered.",
      statusCode: 400,
      requestId,
      ...(fieldErrors ? { fieldErrors } : {}),
    });
  }

  if (code === "NOT_FOUND") {
    set.status = 404;
    return createApiErrorResponse({
      code: "ROUTE_NOT_FOUND",
      message: "The requested API endpoint was not found.",
      statusCode: 404,
      requestId,
    });
  }

  rootLogger.error(
    `Unhandled API error: ${code}`,
    error instanceof Error ? error : undefined,
    { requestId },
  );
  set.status = 500;
  return createApiErrorResponse({
    code: "INTERNAL_ERROR",
    message: "Something went wrong while processing your request. Please try again.",
    statusCode: 500,
    requestId,
  });
};
