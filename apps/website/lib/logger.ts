interface LogContext {
  [key: string]: unknown;
}

const normalizeError = (error: unknown) =>
  error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: String(error) };

export const websiteLogger = {
  error(event: string, error: unknown, context: LogContext = {}) {
    console.error(
      JSON.stringify({
        level: "error",
        event,
        ...normalizeError(error),
        ...context,
      }),
    );
  },
};
