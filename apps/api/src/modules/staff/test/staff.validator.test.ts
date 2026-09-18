import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createStaffBody,
  updateStaffBody,
  staffIdParams,
} from "@/modules/staff/staff.validator";
describe("staff validators", () => {
  it("accepts valid create payloads and rejects invalid required fields", () => {
    expect(
      Value.Check(createStaffBody, {
        firstName: "A",
        lastName: "B",
        email: "a@example.com",
        password: "password1",
        roleId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(true);
    expect(
      Value.Check(createStaffBody, {
        firstName: "",
        lastName: "B",
        email: "a@example.com",
        password: "password1",
        roleId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(false);
    expect(
      Value.Check(createStaffBody, {
        firstName: "A",
        lastName: "B",
        email: "bad",
        password: "password1",
        roleId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(false);
    expect(
      Value.Check(createStaffBody, {
        firstName: "A",
        lastName: "B",
        email: "a@example.com",
        password: "short",
        roleId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(false);
  });
  it("validates optional update fields and ids", () => {
    expect(
      Value.Check(updateStaffBody, {
        status: "ACTIVE",
        roleId: "11111111-1111-4111-8111-111111111111",
        branchIds: ["22222222-2222-4222-8222-222222222222"],
      }),
    ).toBe(true);
    expect(Value.Check(updateStaffBody, { status: "NOPE" })).toBe(false);
    expect(Value.Check(updateStaffBody, { branchIds: [1] })).toBe(false);
    expect(
      Value.Check(staffIdParams, {
        id: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(true);
    expect(Value.Check(staffIdParams, { id: 1 })).toBe(false);
  });
});
