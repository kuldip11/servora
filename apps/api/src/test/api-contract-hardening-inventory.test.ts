import { describe, expect, it } from "vitest";
import { getApiEndpointManifest } from "./helpers/api-endpoint-manifest";

const BASELINE_ENDPOINT_COUNT = 229;

describe("API contract hardening inventory", () => {
  const endpoints = getApiEndpointManifest();

  it("keeps every current endpoint represented in the generated inventory", () => {
    expect(endpoints).toHaveLength(BASELINE_ENDPOINT_COUNT);
    expect(new Set(endpoints.map((endpoint) => endpoint.id)).size).toBe(
      endpoints.length,
    );
  });

  it("records contract-hardening metadata for every endpoint", () => {
    for (const endpoint of endpoints) {
      expect(endpoint.source).toBeTruthy();
      expect(endpoint.authMode).toMatch(
        /^(bearer|public|customer-session|metrics-token|webhook)$/,
      );
      expect(Array.isArray(endpoint.successStatuses)).toBe(true);
      expect(endpoint.successStatuses.length).toBeGreaterThan(0);
      expect(typeof endpoint.responseSchemaDeclared).toBe("boolean");
      expect(typeof endpoint.hasHeaders).toBe("boolean");
      expect(typeof endpoint.hasCookies).toBe("boolean");
      expect(typeof endpoint.hasRawBody).toBe("boolean");
    }
  });

  it("requires an explicit runtime response contract for every endpoint", () => {
    const missing = endpoints.filter(
      (endpoint) => !endpoint.responseSchemaDeclared,
    );
    expect(missing.map((endpoint) => endpoint.id)).toEqual([]);
  });
});
