import { describe, expect, it } from "vitest";
import { organizationNotFound } from "../organization.errors";
describe("organization errors", () => {
  it("creates not found error", () => {
    expect(organizationNotFound("o1").message).toContain("o1");
  });
});
