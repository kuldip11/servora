import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  createTableBody,
  updateTableBody,
  updateTableStatusBody,
  tableIdParams,
} from "@/modules/tables/table.validator";
describe("table validators", () => {
  it("accepts valid create/update payloads and rejects boundaries", () => {
    expect(
      Value.Check(createTableBody, {
        name: "A",
        capacity: 1,
        section: "Main",
        branchId: "00000000-0000-4000-8000-000000000002",
      }),
    ).toBe(true);
    expect(Value.Check(createTableBody, { name: "", capacity: 0 })).toBe(false);
    expect(Value.Check(createTableBody, { name: "x".repeat(51) })).toBe(false);
    expect(
      Value.Check(updateTableBody, { status: "OCCUPIED", capacity: 2 }),
    ).toBe(true);
    expect(Value.Check(updateTableBody, { status: "INVALID" })).toBe(false);
  });
  it("accepts only supported statuses and string ids", () => {
    for (const status of ["AVAILABLE", "OCCUPIED", "CLEANING", "RESERVED"])
      expect(Value.Check(updateTableStatusBody, { status })).toBe(true);
    expect(Value.Check(updateTableStatusBody, { status: "BROKEN" })).toBe(
      false,
    );
    expect(
      Value.Check(tableIdParams, {
        id: "00000000-0000-4000-8000-000000000001",
      }),
    ).toBe(true);
    expect(Value.Check(tableIdParams, { id: 1 })).toBe(false);
  });
});
