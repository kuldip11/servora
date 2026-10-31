export type ExplanationTrace = {
  stage: string;
  explanation: string;
};

export type AvailabilitySnapshot = {
  effectiveStatus: string;
  reason?: string | null;
  cause: string;
  branchId: string;
  channel: string;
  fulfillmentType: string;
  asOf: string;
};

export type PricingReplay = {
  priceSource?: { kind: string; id: string; description: string } | null;
  baseResolvedUnitPrice: number;
  variantDelta: number;
  modifierDelta: number;
  comboDelta: number;
  promotionDelta: number;
  loyaltyDelta: number;
  persistedSubtotal: number;
  payableBeforeTax: number;
  matchesSnapshot: boolean;
};

export type ExplanationLine = {
  orderItemId: string;
  name: string;
  asOf: string;
  historicalEvidenceComplete: boolean;
  availabilityAtOrder?: AvailabilitySnapshot | null;
  pricingReplay: PricingReplay;
  authoritativePricingReplay?: {
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    matchesSnapshot: boolean;
  } | null;
  authoritativeAvailabilityReplay?: {
    effectiveStatus: string;
    isHidden: boolean;
    availabilityReason: string | null;
    availabilityCause: string;
    matchesSnapshot: boolean;
  } | null;
  trace: ExplanationTrace[];
};

export type OrderExplanation = {
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
  lines: ExplanationLine[];
};
