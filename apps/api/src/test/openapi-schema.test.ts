import { describe, expect, it } from "vitest";

import { app } from "../index";
import { getApiEndpointManifest } from "./helpers/api-endpoint-manifest";

const OPENAPI_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);

const normalizeOpenApiPath = (path: string) => {
  const normalized = path.replace(/\{([^}]+)\}/g, ":$1");
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
};

describe("OpenAPI contract", () => {
  it("documents every HTTP endpoint and every operation declares responses", async () => {
    const response = await app.handle(
      new Request("http://localhost/swagger/json"),
    );
    expect(response.status).toBe(200);

    const spec = (await response.json()) as {
      openapi?: string;
      paths?: Record<
        string,
        Record<string, { responses?: Record<string, unknown> }>
      >;
    };
    expect(spec.openapi).toMatch(/^3\./);

    const operations = Object.entries(spec.paths ?? {}).flatMap(
      ([path, pathItem]) =>
        Object.entries(pathItem)
          .filter(([method]) => OPENAPI_METHODS.has(method))
          .map(([method, operation]) => ({
            method: method.toUpperCase(),
            path,
            operation,
          })),
    );

    const manifestIds = getApiEndpointManifest()
      .map((endpoint) => endpoint.id)
      .sort();
    const documentedIds = operations
      .map(({ method, path }) => `${method} ${normalizeOpenApiPath(path)}`)
      .sort();

    expect(documentedIds).toEqual(manifestIds);
    expect(
      operations.filter(
        ({ operation }) =>
          !operation.responses || Object.keys(operation.responses).length === 0,
      ),
    ).toEqual([]);
  });
});
