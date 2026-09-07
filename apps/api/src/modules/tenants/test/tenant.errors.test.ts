import { describe, expect, it } from "vitest";
import { tenantNotFound } from "../tenant.errors";
describe("tenant errors", () => {
  it("creates tenant not found error", () => {
    const e = tenantNotFound("t1");
    expect(e.message).toContain("t1");
  });
});
