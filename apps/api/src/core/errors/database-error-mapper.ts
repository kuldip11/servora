import { ConflictError, ServiceUnavailableError } from "./app-error";

interface DatabaseLikeError {
  code?: unknown;
  constraint_name?: unknown;
  constraint?: unknown;
}

const dbCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const code = (error as DatabaseLikeError).code;
  return typeof code === "string" ? code : undefined;
};

export const mapDatabaseError = (error: unknown) => {
  switch (dbCode(error)) {
    case "23505":
      return new ConflictError("This information already exists.", {
        reason: "RESOURCE_ALREADY_EXISTS",
      });
    case "23503":
      return new ConflictError(
        "This change cannot be completed because related information is still in use.",
        { reason: "RESOURCE_IN_USE" },
      );
    case "23502":
    case "22P02":
      return undefined;
    case "40001":
    case "40P01":
    case "53300":
    case "57P01":
      return new ServiceUnavailableError(
        "The service is temporarily busy. Please try again.",
      );
    default:
      return undefined;
  }
};
