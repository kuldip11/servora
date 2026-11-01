import { describe, expect, it, vi } from "vitest";
import type { AxiosInstance } from "axios";
import {
  OPENAPI_OPERATIONS,
  createGeneratedOpenApiClient,
} from "../generated/openapi-contract";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("generated OpenAPI client", () => {
  it("contains the complete current operation registry", () => {
    expect(Object.keys(OPENAPI_OPERATIONS)).toHaveLength(229);
  });

  it("interpolates path parameters and omits undefined axios options", async () => {
    const request = vi.fn().mockResolvedValue({ data: { id: uuid } });
    const client = createGeneratedOpenApiClient({
      request,
    } as unknown as AxiosInstance);

    await client.request("getApiOrdersById", {
      pathParams: { id: uuid },
    });

    expect(request).toHaveBeenCalledWith({
      method: "GET",
      url: `/api/orders/${uuid}`,
    });
  });
});
