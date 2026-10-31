import { beforeAll, describe, expect, it } from "vitest";
import { FormatRegistry } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { realtimeEnvelopeSchema } from "../realtime";

const envelope = {
  type: "menu.availability.updated",
  tenantId: "11111111-1111-4111-8111-111111111111",
  branchId: "22222222-2222-4222-8222-222222222222",
  timestamp: "2026-09-27T00:00:00.000Z",
  payload: {
    source: "INVENTORY",
    entityType: "ITEM",
    entityId: "33333333-3333-4333-8333-333333333333",
    menuItemId: "33333333-3333-4333-8333-333333333333",
    computedStatus: "OUT_OF_STOCK",
    reason: "Insufficient inventory",
  },
} as const;

describe("realtime wire contracts", () => {
  beforeAll(() => {
    if (!FormatRegistry.Has("date-time")) {
      FormatRegistry.Set(
        "date-time",
        (value) => !Number.isNaN(Date.parse(value)),
      );
    }
  });
  it("accepts a valid discriminated event envelope", () => {
    expect(Value.Check(realtimeEnvelopeSchema, envelope)).toBe(true);
  });

  it("rejects payloads that do not match their event discriminator", () => {
    expect(
      Value.Check(realtimeEnvelopeSchema, {
        ...envelope,
        type: "payment.updated",
      }),
    ).toBe(false);
  });

  it("rejects internal or unknown fields at the public boundary", () => {
    expect(
      Value.Check(realtimeEnvelopeSchema, {
        ...envelope,
        payload: { ...envelope.payload, internalCost: 12 },
      }),
    ).toBe(false);
  });
});
