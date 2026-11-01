import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const args = new Set(process.argv.slice(2));
const planOnly = args.has("--plan");
const keepGoing = args.has("--keep-going");

const root = resolve(import.meta.dirname, "../..");
const reportDir = resolve(root, ".verification");
const reportPath = resolve(reportDir, "release-baseline.json");

const steps = [
  {
    id: "migration-integrity",
    label: "Database migration integrity",
    command: ["bun", "run", "verify:migrations"],
  },
  {
    id: "env-contract",
    label: "Environment example contract",
    command: ["bun", "run", "validate:env"],
  },
  {
    id: "rbac-audit",
    label: "RBAC static audit",
    command: ["bun", "run", "audit:rbac"],
  },
  {
    id: "lint",
    label: "Monorepo lint",
    command: ["bun", "run", "lint"],
  },
  {
    id: "typecheck",
    label: "All workspace typechecks",
    command: ["bun", "run", "typecheck"],
  },
  {
    id: "build",
    label: "All workspace production builds",
    command: ["bun", "run", "build"],
  },
  {
    id: "billing-postgres",
    label: "Billing PostgreSQL acceptance (explicit test database required)",
    command: ["bun", "run", "test:billing:postgres"],
  },
  {
    id: "unit-tests",
    label: "All workspace unit/integration tests",
    command: ["bun", "run", "test"],
  },
  {
    id: "coverage",
    label: "Coverage suites",
    command: ["bun", "run", "test:coverage"],
  },
  {
    id: "web-e2e",
    label: "POS/Admin browser E2E",
    command: ["bun", "run", "test:e2e"],
  },
  {
    id: "website-e2e",
    label: "Website browser E2E + accessibility",
    command: ["bun", "run", "test:e2e:website"],
  },
];

function commandText(command) {
  return command.join(" ");
}

function writeReport(report) {
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (planOnly) {
  console.log("Servora pre-v1 release verification plan");
  for (const [index, step] of steps.entries()) {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${step.label}: ${commandText(step.command)}`,
    );
  }
  process.exit(0);
}

const startedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  profile: "pre-v1-release",
  startedAt,
  finishedAt: null,
  status: "running",
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  steps: [],
};

if (!existsSync(resolve(root, "node_modules"))) {
  report.status = "blocked";
  report.finishedAt = new Date().toISOString();
  report.blocker =
    "node_modules is missing. Run `bun install --frozen-lockfile` first.";
  writeReport(report);
  console.error(report.blocker);
  process.exit(2);
}

const bunCheck = spawnSync("bun", ["--version"], {
  cwd: root,
  encoding: "utf8",
});
if (bunCheck.error || bunCheck.status !== 0) {
  report.status = "blocked";
  report.finishedAt = new Date().toISOString();
  report.blocker =
    "Bun is required. Install the version declared by packageManager in package.json.";
  writeReport(report);
  console.error(report.blocker);
  process.exit(2);
}
report.environment.bun = bunCheck.stdout.trim();

let failed = false;

for (const step of steps) {
  const stepStarted = Date.now();
  console.log(`\n==> ${step.label}`);
  console.log(`$ ${commandText(step.command)}`);

  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  const entry = {
    id: step.id,
    label: step.label,
    command: commandText(step.command),
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status,
    durationMs: Date.now() - stepStarted,
  };
  report.steps.push(entry);

  if (result.status !== 0) {
    failed = true;
    if (!keepGoing) break;
  }
}

report.finishedAt = new Date().toISOString();
report.status = failed ? "failed" : "passed";
writeReport(report);

console.log(`\nVerification report: ${reportPath}`);
console.log(`Result: ${report.status.toUpperCase()}`);
process.exit(failed ? 1 : 0);
