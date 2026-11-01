import { describe, expect, it } from "vitest";
import { Value } from "@sinclair/typebox/value";
import {
  exportItemsQuery,
  exportQuery,
  importFileBody,
} from "@/modules/menu/import-export/import-export.validator";

describe("import-export.validator validators", () => {
  it("allows optional export query fields", () => {
    expect(Value.Check(exportItemsQuery, {})).toBe(true);
    expect(
      Value.Check(exportItemsQuery, {
        format: "csv",
        branchId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toBe(true);
    expect(Value.Check(exportQuery, {})).toBe(true);
    expect(Value.Check(exportQuery, { format: "xlsx" })).toBe(true);
  });
  it("requires an uploaded file for import", () => {
    expect(Value.Check(importFileBody, {})).toBe(false);
  });
});
