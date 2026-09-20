import { describe, expect, it } from "vitest";
import { createApiContractApp } from "@/test/helpers/create-api-contract-app";
import {
  getApiEndpointManifest,
  materializeEndpointPath,
  type ApiEndpointManifestEntry,
} from "@/test/helpers/api-endpoint-manifest";
import {
  expectApiError,
  expectFrontendSafeError,
} from "@/test/helpers/api-error.assertions";
import { sign } from "jsonwebtoken";

const endpoints = getApiEndpointManifest();
const bearerEndpoints = endpoints.filter(
  (endpoint) => endpoint.authMode === "bearer",
);
const bodyEndpoints = endpoints.filter(
  (endpoint) => endpoint.hasBody && endpoint.authMode !== "webhook",
);

const testAccessToken = sign(
  {
    sub: "00000000-0000-4000-8000-000000000099",
    app: "web",
    email: "contract-test@servora.test",
    roles: [],
    permissions: [],
  },
  process.env.JWT_SECRET ?? "test-jwt-secret-change-me",
  { expiresIn: "5m" },
);

const headersForMalformedBody = (
  endpoint: ApiEndpointManifestEntry,
): Record<string, string> => {
  if (endpoint.authMode === "bearer") {
    return {
      authorization: `Bearer ${testAccessToken}`,
      "x-servora-app": "web",
    };
  }
  if (endpoint.authMode === "customer-session") {
    return { "x-customer-session": "malformed-session-token" };
  }
  return {};
};

const requestFor = (
  endpoint: ApiEndpointManifestEntry,
  extraHeaders: Record<string, string> = {},
) => {
  const method = endpoint.method;
  const headers = new Headers(extraHeaders);
  const init: RequestInit = { method, headers };
  if (["POST", "PUT", "PATCH"].includes(method)) {
    headers.set("content-type", "application/json");
    init.body = "{}";
  }
  return new Request(
    `http://localhost${materializeEndpointPath(endpoint.path)}`,
    init,
  );
};

describe("exhaustive API endpoint error matrix", () => {
  it("accounts for every HTTP endpoint with a unique contract entry", () => {
    expect(endpoints).toHaveLength(229);
    expect(new Set(endpoints.map((endpoint) => endpoint.id)).size).toBe(
      endpoints.length,
    );
    expect(
      endpoints.filter((endpoint) => endpoint.authMode === "bearer").length,
    ).toBeGreaterThan(180);
    expect(endpoints.every((endpoint) => endpoint.source.length > 0)).toBe(
      true,
    );
  });

  it.each(bearerEndpoints.map((endpoint) => [endpoint.id, endpoint] as const))(
    "%s returns the frontend-safe auth error envelope without credentials",
    async (_id, endpoint) => {
      const app = createApiContractApp();
      const response = await app.handle(requestFor(endpoint));
      await expectApiError(response, {
        status: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    },
  );

  it.each(bearerEndpoints.map((endpoint) => [endpoint.id, endpoint] as const))(
    "%s sanitizes malformed bearer credentials",
    async (_id, endpoint) => {
      const app = createApiContractApp();
      const response = await app.handle(
        requestFor(endpoint, { authorization: "Bearer definitely-not-a-jwt" }),
      );
      await expectApiError(response, {
        status: 401,
        code: "UNAUTHORIZED",
        retryable: false,
      });
    },
  );

  it.each(bodyEndpoints.map((endpoint) => [endpoint.id, endpoint] as const))(
    "%s returns a frontend-safe envelope for malformed JSON",
    async (_id, endpoint) => {
      const app = createApiContractApp();
      const headers = new Headers(headersForMalformedBody(endpoint));
      headers.set("content-type", "application/json");
      const response = await app.handle(
        new Request(
          `http://localhost${materializeEndpointPath(endpoint.path)}`,
          {
            method: endpoint.method,
            headers,
            body: "{",
          },
        ),
      );
      const error = await expectFrontendSafeError(response);
      const optionalBodyBeforePermission = new Set([
        "POST /api/menu/items/:id/duplicate",
        "POST /api/menu/templates/:id/apply",
      ]);
      if (!optionalBodyBeforePermission.has(endpoint.id)) {
        expect(response.status).toBe(400);
        expect(error.error?.code).toBe("MALFORMED_REQUEST");
      }
    },
  );

  it("protects metrics without revealing endpoint internals", async () => {
    const app = createApiContractApp();
    const response = await app.handle(new Request("http://localhost/metrics"));
    await expectApiError(response, {
      status: 404,
      code: "ROUTE_NOT_FOUND",
      retryable: false,
    });
  });

  it("returns a structured validation error for malformed frontend telemetry", async () => {
    const app = createApiContractApp();
    const response = await app.handle(
      new Request("http://localhost/api/telemetry/frontend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "not-a-valid-type" }),
      }),
    );
    await expectApiError(response, {
      status: 400,
      code: "VALIDATION_FAILED",
      retryable: false,
    });
  });

  it("returns customer-session-required without exposing implementation details", async () => {
    const app = createApiContractApp();
    const response = await app.handle(
      new Request("http://localhost/api/customer/menu"),
    );
    await expectApiError(response, {
      status: 401,
      code: "CUSTOMER_SESSION_REQUIRED",
      retryable: false,
    });
  });

  it.each([
    ["POST", "/api/auth/signup"],
    ["POST", "/api/auth/login"],
  ] as const)(
    "%s %s returns structured validation errors",
    async (method, path) => {
      const app = createApiContractApp();
      const response = await app.handle(
        new Request(`http://localhost${path}`, {
          method,
          headers: { "content-type": "application/json" },
          body: "{}",
        }),
      );
      await expectApiError(response, {
        status: 400,
        code: "VALIDATION_FAILED",
        retryable: false,
      });
    },
  );

  it("returns a friendly refresh-token failure instead of token internals", async () => {
    const app = createApiContractApp();
    const response = await app.handle(
      new Request("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: { origin: "http://localhost:5173", "x-servora-app": "web" },
      }),
    );
    expect([400, 401, 403]).toContain(response.status);
    const body = (await response.json()) as {
      success?: unknown;
      error?: { code?: unknown; message?: unknown; requestId?: unknown };
    };
    expect(body.success).toBe(false);
    expect(typeof body.error?.code).toBe("string");
    expect(typeof body.error?.message).toBe("string");
    expect(typeof body.error?.requestId).toBe("string");
    expect(JSON.stringify(body)).not.toMatch(
      /jwt|cookie parser|stack|node_modules|\.ts:\d+/i,
    );
  });
});
