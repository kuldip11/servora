import { describe, expect, it } from "vitest";
import { resolveEffectiveAvailability } from "@/modules/menu/availability/availability-resolution";
import type { AvailabilityReplayEvidence } from "@/modules/menu/availability/availability.types";

const evidence = (
  overrides: Partial<AvailabilityReplayEvidence> = {},
): AvailabilityReplayEvidence => {
  return {
    item: {
      id: "item-1",
      branchId: null,
      status: "ACTIVE",
      basePrice: "10.00",
      taxRate: "5.00",
      prepTimeMinutes: 10,
      availabilityReason: null,
      manualOverrideStatus: null,
      manualOverrideReason: null,
      manualStockCount: null,
    },
    resolvedStatus: { status: "ACTIVE", reason: "Base status" },
    branchOverride: null,
    channelOverride: null,
    ...overrides,
  };
};

describe("resolveEffectiveAvailability", () => {
  it("prefers a human override over lower layers", () => {
    const result = resolveEffectiveAvailability(
      evidence({
        item: {
          ...evidence().item,
          manualOverrideStatus: "OUT_OF_STOCK",
          manualOverrideReason: "Manager stopped sales",
        },
        channelOverride: { status: "ACTIVE" },
      }),
    );
    expect(result.effectiveStatus).toBe("OUT_OF_STOCK");
    expect(result.availabilityCause).toBe("MANUAL_OVERRIDE");
    expect(result.availabilityReason).toBe("Manager stopped sales");
  });

  it("classifies a depleted manual count before branch/channel status", () => {
    const result = resolveEffectiveAvailability(
      evidence({
        item: { ...evidence().item, manualStockCount: 0 },
        resolvedStatus: {
          status: "OUT_OF_STOCK",
          reason: "Manual stock count depleted",
        },
        channelOverride: { status: "ACTIVE" },
      }),
    );
    expect(result.effectiveStatus).toBe("OUT_OF_STOCK");
    expect(result.availabilityCause).toBe("MANUAL_COUNT");
  });

  it("layers channel visibility over branch presentation values", () => {
    const result = resolveEffectiveAvailability(
      evidence({
        branchOverride: { price: "12.00", prepTimeMinutes: 15 },
        channelOverride: {
          isHidden: true,
          availabilityReason: "Hidden from QR",
        },
      }),
    );
    expect(result.effectivePrice).toBe("12.00");
    expect(result.effectivePrepTimeMinutes).toBe(15);
    expect(result.isHidden).toBe(true);
    expect(result.availabilityCause).toBe("CHANNEL_OVERRIDE");
  });

  it("recognizes schedule-derived status as a schedule cause", () => {
    const result = resolveEffectiveAvailability(
      evidence({
        resolvedStatus: {
          status: "OUT_OF_STOCK",
          reason: "Daily window 10:00:00–12:00:00",
        },
      }),
    );
    expect(result.effectiveStatus).toBe("OUT_OF_STOCK");
    expect(result.availabilityCause).toBe("SCHEDULE");
  });
});

describe("resolveEffectiveAvailability additional branches",()=>{
  it("covers branch/channel/base/recipe causes and presentation fallbacks",()=>{
    expect(resolveEffectiveAvailability(evidence({channelOverride:{status:"OUT_OF_STOCK"}})).availabilityCause).toBe("CHANNEL_OVERRIDE");
    expect(resolveEffectiveAvailability(evidence({branchOverride:{status:"OUT_OF_STOCK",taxRate:"7.00",isHidden:true,availabilityReason:"branch"}}))).toMatchObject({availabilityCause:"BRANCH_OVERRIDE",effectiveTaxRate:"7.00",isHidden:true,availabilityReason:"branch"});expect(resolveEffectiveAvailability(evidence({branchOverride:{status:null,isHidden:true}})).availabilityCause).toBe("BRANCH_OVERRIDE");
    expect(resolveEffectiveAvailability(evidence({resolvedStatus:{status:"OUT_OF_STOCK",reason:"Insufficient inventory"}})).availabilityCause).toBe("RECIPE_DRIVEN");
    expect(resolveEffectiveAvailability(evidence({resolvedStatus:{status:"ACTIVE",reason:"Base status"}}))).toMatchObject({availabilityCause:"BASE_STATUS",effectivePrice:"10.00",effectiveTaxRate:"5.00",effectivePrepTimeMinutes:10,isHidden:false,overrideApplied:false});
  });
  it("uses manual override default reason and recognizes all schedule reason forms",()=>{
    expect(resolveEffectiveAvailability(evidence({item:{...evidence().item,manualOverrideStatus:"OUT_OF_STOCK",manualOverrideReason:null}})).availabilityReason).toBe("Manual availability override");
    for(const reason of ["Scheduled 2026-09-06","Holiday: Fest","Sunday 10:00:00–12:00:00"]){expect(resolveEffectiveAvailability(evidence({resolvedStatus:{status:"OUT_OF_STOCK",reason}})).availabilityCause).toBe("SCHEDULE");}
  });
});
