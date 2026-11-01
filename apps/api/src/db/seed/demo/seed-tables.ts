import type { SeedDatabase, DemoConfig, SeedContext } from "./types";
import {
  cancellationReasons,
  kitchenStations,
  restaurantTables,
} from "@/db/schema";
import { uuidFor } from "./utils";

export const seedTablesAndStations = async (
  db: SeedDatabase,
  config: DemoConfig,
  ctx: SeedContext,
): Promise<void> => {
  for (const brand of config.brands) {
    const tenantId = ctx.tenantIds[brand.key]!;
    for (const [branchIndex, branchId] of ctx.branchIds[brand.key]!.entries()) {
      const tableRows = Array.from(
        { length: config.tablesPerBranch },
        (_, tableIndex) => ({
          id: uuidFor(`table:${brand.key}:${branchIndex}:${tableIndex}`),
          tenantId,
          branchId,
          name: `T${tableIndex + 1}`,
          publicQrToken: uuidFor(
            `table-qr:${brand.key}:${branchIndex}:${tableIndex}`,
          ),
          capacity: tableIndex % 5 === 0 ? 6 : tableIndex % 3 === 0 ? 2 : 4,
          status: (["OCCUPIED", "RESERVED", "CLEANING", "AVAILABLE"] as const)[
            tableIndex < 6 ? 0 : tableIndex === 6 ? 1 : tableIndex === 7 ? 2 : 3
          ]!,
          section:
            tableIndex < Math.ceil(config.tablesPerBranch / 2)
              ? "Main Floor"
              : "Patio",
          isActive: tableIndex !== config.tablesPerBranch - 1,
        }),
      );
      await db.insert(restaurantTables).values(tableRows);
      await db.insert(kitchenStations).values([
        {
          id: uuidFor(`station:${brand.key}:${branchIndex}:hot`),
          tenantId,
          branchId,
          name: "Hot Kitchen",
          sortOrder: 1,
        },
        {
          id: uuidFor(`station:${brand.key}:${branchIndex}:cold`),
          tenantId,
          branchId,
          name: "Cold / Pantry",
          sortOrder: 2,
        },
        {
          id: uuidFor(`station:${brand.key}:${branchIndex}:beverage`),
          tenantId,
          branchId,
          name: "Beverage",
          sortOrder: 3,
        },
      ]);
    }
    await db.insert(cancellationReasons).values([
      {
        id: uuidFor(`cancel-reason:${brand.key}:guest`),
        tenantId,
        label: "Guest changed their mind",
      },
      {
        id: uuidFor(`cancel-reason:${brand.key}:unavailable`),
        tenantId,
        label: "Item unavailable",
      },
      {
        id: uuidFor(`cancel-reason:${brand.key}:mistake`),
        tenantId,
        label: "Order entered by mistake",
      },
      {
        id: uuidFor(`cancel-reason:${brand.key}:legacy`),
        tenantId,
        label: "Legacy inactive reason",
        isActive: false,
      },
    ]);
  }
};
