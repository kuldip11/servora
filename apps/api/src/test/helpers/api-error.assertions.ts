import { expect } from "vitest";

export interface ExpectedApiError {
  status: number;
  code: string;
  message?: string;
  retryable?: boolean;
  field?: string;
}

export const expectApiError = async (response: Response, expected: ExpectedApiError) => {
  expect(response.status).toBe(expected.status);
  const body = (await response.json()) as {
    success?: unknown;
    error?: {
      code?: unknown;
      message?: unknown;
      retryable?: unknown;
      requestId?: unknown;
      fieldErrors?: Record<string, string[]>;
    };
  };
  expect(body.success).toBe(false);
  expect(body.error?.code).toBe(expected.code);
  expect(typeof body.error?.message).toBe("string");
  expect(String(body.error?.message).trim().length).toBeGreaterThan(0);
  expect(typeof body.error?.retryable).toBe("boolean");
  expect(typeof body.error?.requestId).toBe("string");
  if (expected.message) expect(body.error?.message).toBe(expected.message);
  if (expected.retryable !== undefined) expect(body.error?.retryable).toBe(expected.retryable);
  if (expected.field) expect(body.error?.fieldErrors?.[expected.field]?.length).toBeGreaterThan(0);
  expect(JSON.stringify(body)).not.toMatch(/PostgresError|ECONNREFUSED|node_modules|\.ts:\d+|SQLSTATE|stack/i);
  return body;
};

export const expectFrontendSafeError = async (response: Response) => {
  expect(response.status).toBeGreaterThanOrEqual(400);
  const body = (await response.json()) as {
    success?: unknown;
    error?: {
      code?: unknown;
      message?: unknown;
      retryable?: unknown;
      requestId?: unknown;
      fieldErrors?: Record<string, string[]>;
    };
  };
  expect(body.success).toBe(false);
  expect(typeof body.error?.code).toBe("string");
  expect(String(body.error?.code).trim().length).toBeGreaterThan(0);
  expect(typeof body.error?.message).toBe("string");
  expect(String(body.error?.message).trim().length).toBeGreaterThan(0);
  expect(typeof body.error?.retryable).toBe("boolean");
  expect(typeof body.error?.requestId).toBe("string");
  expect(JSON.stringify(body)).not.toMatch(
    /PostgresError|ECONNREFUSED|node_modules|\.ts:\d+|SQLSTATE|stack|SyntaxError|Unexpected token/i,
  );
  return body;
};
