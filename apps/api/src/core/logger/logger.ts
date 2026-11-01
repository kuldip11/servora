export interface LogContext {
  requestId?: string;
  tenantId?: string;
  branchId?: string;
  userId?: string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = [
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "apikey",
  "creditcard",
  "ssn",
];

const sanitize = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const sanitized: Record<string, unknown> = {
    ...(value as Record<string, unknown>),
  };
  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
      sanitized[key] = sanitize(sanitized[key]);
    }
  }
  return sanitized;
};

export class Logger {
  constructor(
    private readonly context: LogContext,
    private readonly module: string,
    private readonly isDevelopment = process.env["NODE_ENV"] !== "production",
  ) {}

  private formatLog(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
  ) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      requestId: this.context.requestId,
      tenantId: this.context.tenantId,
      branchId: this.context.branchId,
      userId: this.context.userId,
      module: this.module,
      message,
      ...(meta && { meta: sanitize(meta) }),
    });
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (this.isDevelopment)
      console.debug(this.formatLog("debug", message, meta));
  }

  info(message: string, meta?: Record<string, unknown>) {
    console.log(this.formatLog("info", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(this.formatLog("warn", message, meta));
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>) {
    console.error(
      this.formatLog("error", message, {
        error: {
          name: error?.name,
          message: error?.message,
          stack: this.isDevelopment ? error?.stack : undefined,
        },
        ...meta,
      }),
    );
  }

  child(context: Partial<LogContext> & { module?: string }): Logger {
    const { module, ...rest } = context;
    return new Logger(
      { ...this.context, ...rest },
      module ?? this.module,
      this.isDevelopment,
    );
  }
}

export const createLogger = (
  context: LogContext = {},
  module = "app",
  isDevelopment = process.env["NODE_ENV"] !== "production",
): Logger => new Logger(context, module, isDevelopment);

export const rootLogger = createLogger({}, "root");

export const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));
