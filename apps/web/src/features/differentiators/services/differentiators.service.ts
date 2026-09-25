import {
  createAnalyticsApi,
  createApprovalsApi,
  createAvailabilityApi,
  createMenuApi,
  createOrdersApi,
} from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import type { MenuChoice } from "../components/guided-builder/types";

export type AvailabilityRow = {
  entityType: "ITEM" | "VARIANT" | "MODIFIER_OPTION";
  entityId: string;
  menuItemId: string;
  name: string;
  status: string;
  reason: string;
  cause: string;
  branchId: string;
  branchName?: string;
  channel: string;
  fulfillmentType: string;
};

export type EngineeringQuadrant = "STAR" | "PUZZLE" | "PLOWHORSE" | "DOG";
export type EngineeringRow = {
  menuItemId: string;
  menuItemName: string;
  variantName: string | null;
  margin: number;
  salesVolume: number;
  quadrant: EngineeringQuadrant;
  recommendation: string;
};

export type Explanation = {
  orderId: string;
  asOf: string;
  completeHistory: boolean;
  historyNotice: string;
  totals: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    roundingAdjustment: number;
    totalAmount: number;
  };
  lines: Array<{
    orderItemId: string;
    name: string;
    historicalEvidenceComplete: boolean;
    availabilityAtOrder?: {
      effectiveStatus: string;
      reason?: string | null;
      cause: string;
      channel: string;
      fulfillmentType: string;
    } | null;
    pricingReplay: {
      priceSource?: { description: string } | null;
      baseResolvedUnitPrice: number;
      variantDelta: number;
      modifierDelta: number;
      comboDelta: number;
      promotionDelta: number;
      loyaltyDelta: number;
      persistedSubtotal: number;
      matchesSnapshot: boolean;
    };
    authoritativePricingReplay?: { matchesSnapshot: boolean } | null;
    authoritativeAvailabilityReplay?: { matchesSnapshot: boolean } | null;
    trace: Array<{ stage: string; explanation: string }>;
  }>;
};

const menuApi = createMenuApi(apiClient);
const availabilityApi = createAvailabilityApi(apiClient);
const analyticsApi = createAnalyticsApi(apiClient);
const ordersApi = createOrdersApi(apiClient);
const approvalsApi = createApprovalsApi(apiClient);

export const differentiatorsService = {
  menuChoices: async (): Promise<MenuChoice[]> => {
    const categories = await menuApi.listCategories();
    return categories.flatMap((category) =>
      (category.menuItems ?? [])
        .filter((item) => item.isPublished && item.status !== "DISCONTINUED")
        .map((item) => ({
          id: item.id,
          name: item.name,
          categoryName: category.name,
        })),
    );
  },
  availability: (channel: string, fulfillment: string, cause: string) =>
    availabilityApi.dashboard<{ rows: AvailabilityRow[] }>({
      channel,
      fulfillmentType: fulfillment,
      ...(cause.trim() ? { cause: cause.trim() } : {}),
    }),
  engineering: (windowDays: string) =>
    analyticsApi.menuEngineering<EngineeringRow[]>(Number(windowDays)),
  explainOrder: (orderId: string) => ordersApi.explain<Explanation>(orderId),
  setApprovalThreshold: (
    action: "VOID" | "COMP",
    thresholdAmount: number,
    requiresRole: string,
  ) => approvalsApi.setThreshold(action, { thresholdAmount, requiresRole }),
  previewCombo: menuApi.previewCombo.bind(menuApi),
  createCombo: menuApi.createCombo.bind(menuApi),
  previewPromotion: menuApi.previewPromotion.bind(menuApi),
  createPromotion: menuApi.createPromotion.bind(menuApi),
};
