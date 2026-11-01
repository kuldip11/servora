import { closeDatabaseConnections } from "@/db";
import { resolvePreset } from "./demo/config";
import { parsePreset, parseReferenceTime, DEMO_EMAIL } from "./demo/utils";
import { runDemoSeed } from "./demo/runner";

const main = async () => {
  const args = process.argv.slice(2);
  const config = resolvePreset(parsePreset(args), parseReferenceTime(args));
  console.log(
    `Seeding ${config.preset}: ${config.historyDays} history days, reference ${config.referenceTime.toISOString()}`,
  );
  const result = await runDemoSeed(config, console.log);
  console.log(
    `Demo ready: ${config.brands.length} restaurant concepts, ${Object.values(result.ctx.branchIds).flat().length} branches, ${result.orders} orders, ${result.orderItems} order items.`,
  );
  console.log(
    `Owner login: ${DEMO_EMAIL}. Password: DEMO_PASSWORD override or documented development default.`,
  );
};
main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnections);
