import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { DemoConfig } from "./types";
import { assertDemoEnvironment } from "./utils";
import { resetDemoData } from "./reset";
import { seedOrganization } from "./seed-org";
import { seedTablesAndStations } from "./seed-tables";
import { seedMenus } from "./seed-menu";
import { seedCustomersAndPromotions } from "./seed-customers";
import { seedInventory } from "./seed-inventory";
import { seedOrders } from "./seed-orders";
import { seedConsumption } from "./seed-consumption";
import { verifyDemoSeed } from "./verify";

export const runDemoSeed = async (
  config: DemoConfig,
  report: (message: string) => void = () => {},
) => {
  assertDemoEnvironment();
  if (!Number.isFinite(config.referenceTime.getTime()))
    throw new Error("Invalid demo reference time");
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1936028278, 1)`);
    report("1/8 Resetting previous generated demo records");
    await resetDemoData(tx, report);
    report("2/8 Creating restaurant organizations and staff access");
    const ctx = await seedOrganization(tx, config);
    report("3/8 Creating tables, stations and menu catalogue");
    await seedTablesAndStations(tx, config, ctx);
    await seedMenus(tx, config, ctx);
    report("4/8 Creating customers, loyalty and promotions");
    await seedCustomersAndPromotions(tx, config, ctx);
    report("5/8 Creating inventory and recipes");
    await seedInventory(tx, config, ctx);
    report("6/8 Creating historical and active restaurant orders");
    const generated = await seedOrders(tx, config, ctx);
    report("7/8 Reconciling recipe consumption and stock ledgers");
    await seedConsumption(tx, config, ctx);
    report("8/8 Checking data relationships and financial/stock balances");
    await verifyDemoSeed(tx, config, ctx, report);
    return { ctx, ...generated };
  });
};
export const runDemoReset = async (
  report: (message: string) => void = () => {},
) => {
  assertDemoEnvironment();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(1936028278, 1)`);
    await resetDemoData(tx, report);
  });
};
