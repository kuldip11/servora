import { describe, expect, it } from "vitest";
import { kitchenKeys } from "./kitchen.keys";

describe("kitchenKeys", () => {
  it("isolates ticket and station data by tenant and branch", () => {
    const branchA = ["tenant-1", "branch-a"] as const;
    const branchB = ["tenant-1", "branch-b"] as const;

    expect(kitchenKeys.ticketList(branchA, "grill")).not.toEqual(
      kitchenKeys.ticketList(branchB, "grill"),
    );
    expect(kitchenKeys.stations(branchA)).not.toEqual(
      kitchenKeys.stations(branchB),
    );
    expect(kitchenKeys.ticketList(branchA, "grill")).toEqual([
      "kitchen",
      "tenant-1",
      "branch-a",
      "tickets",
      "grill",
    ]);
  });
});
