import { closeDatabaseConnections } from "@/db";
import { runDemoReset } from "./demo/runner";
runDemoReset(console.log)
  .then(() =>
    console.log(
      "Generated demo data removed; schema, reference data and unrelated records preserved.",
    ),
  )
  .catch((error) => {
    console.error("Demo reset failed:", error);
    process.exitCode = 1;
  })
  .finally(closeDatabaseConnections);
