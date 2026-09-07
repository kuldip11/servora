import type { AuthContext } from "@/core/auth";
import type {
  CostMarginRow,
  MenuEngineeringQuadrant,
  MenuEngineeringRow,
} from "@pos/types";
import { analyticsRepository } from "./analytics.repository";
import {
  assertAnalyticsScope,
  requireAnalyticsPermission,
} from "./analytics-authorization";
import { ValidationError } from "@/core/errors";
import { inventoryService } from "@/modules/inventory/inventory.service";
import { pricingPipeline } from "@/modules/orders/pricing/pricing-pipeline";

const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const classifyMenuEngineering = (
  margin: number,
  volume: number,
  marginThreshold: number,
  volumeThreshold: number,
): MenuEngineeringQuadrant => {
  const highMargin = margin >= marginThreshold;
  const highVolume = volume >= volumeThreshold;
  return highMargin
    ? highVolume
      ? "STAR"
      : "PUZZLE"
    : highVolume
      ? "PLOWHORSE"
      : "DOG";
};

export const analyticsService = {
  async getDashboard(auth: AuthContext) {
    requireAnalyticsPermission(auth, "analytics:read");
    assertAnalyticsScope(auth);

    const since = startOfToday();
    const branchId = auth.branchId;

    const [
      totalOrdersToday,
      revenueToday,
      activeOrders,
      inventoryItems,
      topItems,
      revenueByHour,
      paidOrdersToday,
      cancelledOrdersToday,
    ] = await Promise.all([
      analyticsRepository.countOrdersSince(auth.tenantId, branchId, since),
      analyticsRepository.sumPaidRevenueSince(auth.tenantId, branchId, since),
      analyticsRepository.countActiveOrders(auth.tenantId, branchId),
      analyticsRepository.findActiveInventoryItems(auth.tenantId, branchId),
      analyticsRepository.findTopItems(auth.tenantId, branchId, since),
      analyticsRepository.revenueByHour(auth.tenantId, branchId, since),
      analyticsRepository.countPaidOrdersSince(auth.tenantId, branchId, since),
      analyticsRepository.countCancelledOrdersSince(
        auth.tenantId,
        branchId,
        since,
      ),
    ]);

    const lowStockAlerts = inventoryItems.filter(
      (item) => parseFloat(item.currentStock) <= parseFloat(item.minimumStock),
    ).length;

    return {
      totalOrdersToday,
      revenueToday,
      activeOrders,
      lowStockAlerts,
      topItems,
      revenueByHour,
      paidOrdersToday,
      cancelledOrdersToday,
      averageOrderValue:
        paidOrdersToday > 0 ? revenueToday / paidOrdersToday : 0,
    };
  },

  async getCostMarginReport(auth: AuthContext, categoryId?: string) {
    requireAnalyticsPermission(auth, "analytics:read");
    assertAnalyticsScope(auth);
    if (!auth.branchId) {
      throw new ValidationError(
        "Select a branch to view recipe cost and margin",
      );
    }
    const branchId = auth.branchId;
    const asOf = new Date();
    const items = await analyticsRepository.findCostReportItems(
      auth.tenantId,
      branchId,
      categoryId,
    );
    const selections = items.flatMap((item) => [
      {
        item,
        variantId: null as string | null,
        variantName: null as string | null,
      },
      ...item.variants.map((variant) => ({
        item,
        variantId: variant.id,
        variantName: variant.name,
      })),
    ]);
    const inputs = selections.map((selection) => ({
      menuItemId: selection.item.id,
      ...(selection.variantId ? { variantId: selection.variantId } : {}),
      quantity: 1,
    }));
    const [costs, pricing] = await Promise.all([
      inventoryService.computeRecipeCosts(auth.tenantId, branchId, inputs),
      pricingPipeline.price(
        {
          tenantId: auth.tenantId,
          branchId,
          channel: "STAFF",
          fulfillmentType: "DINE_IN",
          asOf,
          allowUnavailable: true,
          allowIncompleteModifierSelection: true,
        },
        inputs,
      ),
    ]);

    const rows: CostMarginRow[] = selections.map((selection, index) => {
      const recipeCost =
        costs[index] == null ? null : Number(costs[index]!.toFixed(2));
      const manualCost =
        selection.item.manualCost == null
          ? null
          : Number(selection.item.manualCost);
      const effectiveCost = recipeCost ?? manualCost;
      const costSource =
        recipeCost !== null
          ? ("RECIPE" as const)
          : manualCost !== null
            ? ("MANUAL" as const)
            : ("UNKNOWN" as const);
      const price = pricing.lines[index]?.unitPrice ?? 0;
      const margin =
        effectiveCost === null
          ? null
          : Number((price - effectiveCost).toFixed(2));
      const marginPercent =
        margin === null
          ? null
          : price > 0
            ? Number(((margin / price) * 100).toFixed(2))
            : 0;
      return {
        menuItemId: selection.item.id,
        menuItemName: selection.item.name,
        categoryId: selection.item.categoryId,
        categoryName: selection.item.category.name,
        variantId: selection.variantId,
        variantName: selection.variantName,
        price,
        manualCost,
        recipeCost,
        effectiveCost,
        costSource,
        cost: effectiveCost,
        margin,
        marginPercent,
      };
    });
    return rows.sort((a, b) => {
      if (a.marginPercent === null) return 1;
      if (b.marginPercent === null) return -1;
      return b.marginPercent - a.marginPercent;
    });
  },

  async getMenuEngineeringReport(auth: AuthContext, windowDays = 90) {
    requireAnalyticsPermission(auth, "analytics:read");
    assertAnalyticsScope(auth);
    if (!auth.branchId)
      throw new ValidationError("Select a branch to view menu engineering");
    if (!Number.isInteger(windowDays) || windowDays < 7 || windowDays > 365)
      throw new ValidationError("Window must be between 7 and 365 days");
    const since = new Date(Date.now() - windowDays * 86_400_000);
    const [margins, volumeRows] = await Promise.all([
      analyticsService.getCostMarginReport(auth),
      analyticsRepository.salesVolumeByItem(
        auth.tenantId,
        auth.branchId,
        since,
      ),
    ]);
    const volumeByKey = new Map(
      volumeRows.map((row) => [
        `${row.menuItemId}:${row.variantId ?? ""}`,
        row.volume,
      ]),
    );
    const volumes = margins.map(
      (row) => volumeByKey.get(`${row.menuItemId}:${row.variantId ?? ""}`) ?? 0,
    );
    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
    };
    const known = margins
      .map((row, index) => ({ row, volume: volumes[index]! }))
      .filter(
        (
          entry,
        ): entry is {
          row: CostMarginRow & { margin: number };
          volume: number;
        } => entry.row.margin !== null,
      );
    const marginThreshold = median(known.map((entry) => entry.row.margin));
    const volumeThreshold = median(known.map((entry) => entry.volume));
    const recommendations: Record<MenuEngineeringQuadrant, string> = {
      STAR: "Protect consistency and visibility; this item earns well and sells well.",
      PUZZLE:
        "Strong margin, low sales — test placement, naming, photography, or staff prompts.",
      PLOWHORSE:
        "High sales, thin margin — review portion cost or a relevant modifier upcharge.",
      DOG: "Low sales and margin — simplify, reposition, or consider retiring after review.",
      COST_MISSING:
        "Cost is not configured. Add a recipe cost or manual item cost before using this item in margin-based decisions.",
    };
    return margins.map((row, index): MenuEngineeringRow => {
      const quadrant: MenuEngineeringQuadrant =
        row.margin === null
          ? "COST_MISSING"
          : classifyMenuEngineering(
              row.margin,
              volumes[index]!,
              marginThreshold,
              volumeThreshold,
            );
      return {
        ...row,
        salesVolume: volumes[index]!,
        quadrant,
        recommendation: recommendations[quadrant],
      };
    });
  },
};
