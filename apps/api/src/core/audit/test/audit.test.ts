import { describe, expect, it, vi } from "vitest";
const { values, insert } = vi.hoisted(() => {
  const returning = vi
    .fn()
    .mockResolvedValue([{ id: "a1", action: "ORDER_CREATED" }]);
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));
  return { returning, values, insert };
});
vi.mock("../../../db", () => ({ db: { insert } }));
vi.mock("../../../db/schema", () => ({ auditLogs: {} }));
import { writeAudit } from "@/core/audit/audit";

describe("writeAudit", () => {
  it("writes tenant-scoped audit entries with normalized optional fields", async () => {
    const result = await writeAudit({
      tenantId: "t1",
      action: "TENANT_CREATED",
      entity: "tenant",
      metadata: { foo: "bar" },
    });
    expect(insert).toHaveBeenCalledWith({});
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        userId: null,
        branchId: null,
        requestId: null,
        action: "TENANT_CREATED",
        entity: "tenant",
        entityId: null,
        metadata: '{"foo":"bar"}',
        ipAddress: null,
      }),
    );
    expect(result).toEqual({ id: "a1", action: "ORDER_CREATED" });
  });
});
