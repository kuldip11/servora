import { buildBrands } from "./data/brands";
import type { DemoConfig, DemoPreset } from "./types";

export const resolvePreset = (
  preset: DemoPreset,
  referenceTime = new Date(),
): DemoConfig => {
  const config: DemoConfig =
    preset === "demo"
      ? {
          preset,
          referenceTime,
          historyDays: 90,
          ordersPerBranchPerDay: 14,
          customersPerTenant: 500,
          tablesPerBranch: 16,
          inventoryItemsPerBranch: 32,
          staffPerBranch: 8,
          brands: buildBrands(3, 80),
          estimatedSizeMb: 0,
        }
      : {
          preset,
          referenceTime,
          historyDays: 30,
          ordersPerBranchPerDay: 5,
          customersPerTenant: 80,
          tablesPerBranch: 10,
          inventoryItemsPerBranch: 24,
          staffPerBranch: 4,
          brands: buildBrands(2, 40),
          estimatedSizeMb: 0,
        };
  config.estimatedSizeMb = estimateSeedSizeMb(config);
  if (preset === "small" && config.estimatedSizeMb > SMALL_PRESET_MAX_MB) {
    throw new Error(
      `Small preset estimate (${config.estimatedSizeMb} MB) exceeds ${SMALL_PRESET_MAX_MB} MB`,
    );
  }
  return config;
};

/** Conservative heap/database payload estimate. The real seed is normally much smaller. */
export const estimateSeedSizeMb = (config: DemoConfig): number => {
  const branches = config.brands.reduce(
    (sum, brand) => sum + brand.branchCount,
    0,
  );
  const weekdayOrders =
    branches * config.historyDays * config.ordersPerBranchPerDay;
  const weekendAllowance = weekdayOrders * 0.12;
  const liveOrders = branches * 6;
  const orders = weekdayOrders + weekendAllowance + liveOrders;
  const orderGraphBytes = orders * 72_000;
  const customerBytes =
    config.brands.length * config.customersPerTenant * 1_200;
  const catalogBytes =
    config.brands.reduce((sum, brand) => sum + brand.menuItemCount, 0) * 4_000;
  const operationsBytes =
    branches *
    (config.inventoryItemsPerBranch * 1_500 +
      config.tablesPerBranch * 800 +
      config.staffPerBranch * 2_000);
  return Math.ceil(
    (orderGraphBytes + customerBytes + catalogBytes + operationsBytes) /
      1024 /
      1024,
  );
};

export const SMALL_PRESET_MAX_MB = 250;
