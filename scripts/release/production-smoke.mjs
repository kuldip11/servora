const requiredTargets = {
  apiReady: process.env.SMOKE_API_URL
    ? new URL("/health/ready", process.env.SMOKE_API_URL).toString()
    : null,
  web: process.env.SMOKE_WEB_URL ?? null,
  kitchen: process.env.SMOKE_KITCHEN_URL ?? null,
  waiter: process.env.SMOKE_WAITER_URL ?? null,
  customer: process.env.SMOKE_CUSTOMER_URL ?? null,
  website: process.env.SMOKE_WEBSITE_URL ?? null,
};

const missing = Object.entries(requiredTargets)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length) {
  throw new Error(`Missing production smoke targets: ${missing.join(", ")}`);
}

const results = [];
for (const [name, target] of Object.entries(requiredTargets)) {
  const started = performance.now();
  try {
    const response = await fetch(target, {
      redirect: "follow",
      headers: { "user-agent": "servora-production-smoke/1.0" },
    });
    const durationMs = Math.round((performance.now() - started) * 100) / 100;
    results.push({
      name,
      target,
      status: response.status,
      durationMs,
      ok: response.ok,
    });
  } catch (error) {
    results.push({
      name,
      target,
      status: 0,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(results);
if (results.some((result) => !result.ok)) process.exit(1);
console.log(
  "Production HTTP smoke passed. Run the POS Playwright critical path against the same deployment before release.",
);
