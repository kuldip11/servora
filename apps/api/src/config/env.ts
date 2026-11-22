import { z } from "zod";

const urlLike = z.string().min(1);

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  APP_VERSION: z.string().default("development"),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:5176"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  DATABASE_URL: urlLike,
  REDIS_URL: urlLike,
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("15m"),
  METRICS_TOKEN: z.string().min(16).default("development-metrics-token"),
  ASSISTANT_ENABLED: z.enum(["true", "false"]).default("false"),
  ASSISTANT_BRANCH_IDS: z.string().default(""),
  ASSISTANT_MODEL: z.string().default(""),
  AI_GATEWAY_API_KEY: z.string().optional(),
  ASSISTANT_DAILY_TURN_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(10000)
    .default(200),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export type ApiEnv = z.infer<typeof schema>;

export const loadApiEnv = (source: NodeJS.ProcessEnv = process.env): ApiEnv => {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid API environment: ${details}`);
  }
  const value = parsed.data;
  if (value.NODE_ENV === "production") {
    if (value.JWT_SECRET.length < 32 || value.METRICS_TOKEN.length < 32) {
      throw new Error(
        "Invalid API environment: production JWT/metrics secrets must be at least 32 characters",
      );
    }
    const origins = value.CORS_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (origins.includes("*")) {
      throw new Error(
        "Invalid API environment: wildcard CORS is forbidden in production",
      );
    }
    for (const origin of origins) {
      const url = new URL(origin);
      if (
        url.protocol !== "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ) {
        throw new Error(
          `Invalid API environment: production CORS origin must be a public HTTPS URL (${origin})`,
        );
      }
    }
  }
  return value;
};

export const env = loadApiEnv();
