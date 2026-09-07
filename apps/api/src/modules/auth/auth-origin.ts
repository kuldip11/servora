import { env } from "@/config/env";
import { ForbiddenError } from "@/core/errors";

const configuredOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const assertTrustedAuthOrigin = (origin: string | undefined): void => {
  if (!origin) {
    if (env.NODE_ENV === "production") {
      throw new ForbiddenError("Trusted request origin is required");
    }
    return;
  }

  if (!configuredOrigins.includes("*") && !configuredOrigins.includes(origin)) {
    throw new ForbiddenError("Request origin is not allowed");
  }
};
