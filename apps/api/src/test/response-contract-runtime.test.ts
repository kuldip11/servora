import { describe, expect, it } from "vitest";
import { Elysia } from "elysia";
import { approvalThresholdResponseSchema } from "@pos/contracts";

const validThreshold = {
  id: "00000000-0000-4000-8000-000000000001",
  tenantId: "00000000-0000-4000-8000-000000000002",
  actionType: "VOID" as const,
  thresholdAmount: "100.00",
  requiresRole: "Manager",
  createdAt: "2026-09-18T00:00:00.000Z",
  updatedAt: "2026-09-18T00:00:00.000Z",
};

describe("runtime response contracts", () => {
  it("accepts a response matching the declared public DTO", async () => {
    const app = new Elysia().get(
      "/",
      () => ({ success: true as const, data: validThreshold }),
      { response: { 200: approvalThresholdResponseSchema } },
    );
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: validThreshold,
    });
  });

  it("rejects accidental internal fields at the HTTP response boundary", async () => {
    const app = new Elysia().get(
      "/",
      () => ({
        success: true as const,
        data: { ...validThreshold, internalSecret: "must-not-leak" },
      }),
      { response: { 200: approvalThresholdResponseSchema } },
    );
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("must-not-leak");
    expect(body).toEqual({ success: true, data: validThreshold });
  });
});
