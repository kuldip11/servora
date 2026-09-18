import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createBranchBody,
  updateBranchBody,
  branchIdParams,
} from "@/modules/branches/branch.validator";
describe("branch validators", () => {
  it("accepts valid create/update payloads and rejects invalid names", () => {
    expect(
      Value.Check(createBranchBody, {
        name: "Main",
        code: "MAIN-01",
        timezone: "Asia/Kolkata",
        currency: "INR",
        dineInEnabled: true,
      }),
    ).toBe(true);
    expect(
      Value.Check(createBranchBody, {
        name: "",
        code: "M1",
        timezone: "Asia/Kolkata",
        currency: "INR",
      }),
    ).toBe(false);
    expect(
      Value.Check(createBranchBody, {
        name: "x".repeat(201),
        code: "M1",
        timezone: "Asia/Kolkata",
        currency: "INR",
      }),
    ).toBe(false);
    expect(
      Value.Check(updateBranchBody, { name: "Updated", tablesEnabled: false }),
    ).toBe(true);
    expect(
      Value.Check(createBranchBody, {
        name: "Main",
        code: "bad code",
        timezone: "Asia/Kolkata",
        currency: "INR",
      }),
    ).toBe(false);
    expect(
      Value.Check(createBranchBody, {
        name: "Main",
        code: "m1",
        timezone: "Asia/Kolkata",
        currency: "inr",
      }),
    ).toBe(true);
  });
  it("validates branch id params and boolean capability fields", () => {
    expect(
      Value.Check(branchIdParams, {
        id: "00000000-0000-4000-8000-000000000001",
      }),
    ).toBe(true);
    expect(Value.Check(branchIdParams, { id: 1 })).toBe(false);
    expect(Value.Check(updateBranchBody, { dineInEnabled: "yes" })).toBe(false);
  });
});
