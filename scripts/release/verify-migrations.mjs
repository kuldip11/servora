import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const folder = resolve(root, "apps/api/src/db/migrations");
const metaFolder = resolve(folder, "meta");
const errors = [];

const sqlNames = readdirSync(folder)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();
const snapshotNames = readdirSync(metaFolder)
  .filter((name) => /^\d{4}_snapshot\.json$/.test(name))
  .sort();

if (!sqlNames.length) errors.push("No SQL migrations found.");

let journal;
try {
  journal = JSON.parse(
    readFileSync(resolve(metaFolder, "_journal.json"), "utf8"),
  );
} catch (error) {
  errors.push(
    `Unable to read migration journal: ${error instanceof Error ? error.message : String(error)}`,
  );
  journal = { entries: [] };
}

const entries = Array.isArray(journal.entries) ? journal.entries : [];
if (journal.version !== "7" || journal.dialect !== "postgresql") {
  errors.push(
    "Migration journal must use Drizzle metadata version 7 / postgresql.",
  );
}
if (
  sqlNames.length !== entries.length ||
  sqlNames.length !== snapshotNames.length
) {
  errors.push(
    `Migration unit count mismatch: SQL=${sqlNames.length}, journal=${entries.length}, snapshots=${snapshotNames.length}.`,
  );
}

const bannedTag =
  /(phase[_-]?[a-h]|completion|backfill|compatib|missing[_-](?:index|foreign)|hardening|activation)/i;
const seenTags = new Set();
const seenIds = new Set();
let previousSnapshotId = "00000000-0000-0000-0000-000000000000";
let previousTableCount = 0;

for (let i = 0; i < sqlNames.length; i += 1) {
  const prefix = String(i).padStart(4, "0");
  const sqlName = sqlNames[i];
  const expectedSnapshotName = `${prefix}_snapshot.json`;
  const expectedTag = sqlName.replace(/\.sql$/, "");
  const entry = entries[i];

  if (!sqlName?.startsWith(`${prefix}_`)) {
    errors.push(
      `Expected migration prefix ${prefix}, found ${sqlName ?? "nothing"}.`,
    );
  }
  if (snapshotNames[i] !== expectedSnapshotName) {
    errors.push(
      `Expected snapshot ${expectedSnapshotName}, found ${snapshotNames[i] ?? "nothing"}.`,
    );
  }
  if (
    !entry ||
    entry.idx !== i ||
    entry.tag !== expectedTag ||
    entry.version !== "7"
  ) {
    errors.push(
      `Journal entry ${prefix} does not exactly match SQL tag ${expectedTag}.`,
    );
  }
  if (seenTags.has(expectedTag))
    errors.push(`Duplicate migration tag: ${expectedTag}`);
  seenTags.add(expectedTag);
  if (bannedTag.test(expectedTag)) {
    errors.push(
      `Development-history terminology is not allowed in v1 migration tag: ${expectedTag}`,
    );
  }

  const sql = readFileSync(resolve(folder, sqlName), "utf8").trim();
  if (!sql) errors.push(`Empty migration: ${sqlName}`);
  if (/DROP\s+SCHEMA\s+public\s+CASCADE/i.test(sql)) {
    errors.push(
      `Destructive schema reset is not allowed in a migration: ${sqlName}`,
    );
  }
  if (/\b(?:ADD|DROP)\s+COLUMN\b|ALTER\s+TYPE\b.*\bADD\s+VALUE\b/i.test(sql)) {
    errors.push(
      `Canonical baseline migration contains schema-evolution SQL: ${sqlName}`,
    );
  }
  if (
    /(?:CREATE|DROP)\s+(?:TABLE|INDEX|TYPE|TRIGGER|FUNCTION|SCHEMA)\s+IF\s+(?:NOT\s+)?EXISTS|DROP\s+CONSTRAINT\s+IF\s+EXISTS/i.test(
      sql,
    )
  ) {
    errors.push(
      `Canonical baseline migration contains compatibility DDL guards: ${sqlName}`,
    );
  }

  if (i === 0) {
    if (expectedTag !== "0000_enums")
      errors.push("Migration 0000 must be the canonical enum baseline.");
    if (/CREATE\s+TABLE/i.test(sql))
      errors.push("0000_enums must not create application tables.");
  } else {
    const match = expectedTag.match(/^\d{4}_create_(.+)$/);
    if (!match) {
      errors.push(
        `Table migration must use NNNN_create_<table> naming: ${expectedTag}`,
      );
    } else {
      const table = match[1];
      const creates = [...sql.matchAll(/CREATE\s+TABLE\s+"([^"]+)"/gi)].map(
        (m) => m[1],
      );
      if (creates.length !== 1 || creates[0] !== table) {
        errors.push(
          `${sqlName} must create exactly its named table (${table}); found ${creates.join(", ") || "none"}.`,
        );
      }
    }
  }

  try {
    const snapshot = JSON.parse(
      readFileSync(resolve(metaFolder, expectedSnapshotName), "utf8"),
    );
    if (snapshot.version !== "7" || snapshot.dialect !== "postgresql") {
      errors.push(`${expectedSnapshotName} must use version 7 / postgresql.`);
    }
    if (snapshot.prevId !== previousSnapshotId) {
      errors.push(
        `${expectedSnapshotName} prevId does not chain to the previous snapshot.`,
      );
    }
    if (!snapshot.id || seenIds.has(snapshot.id)) {
      errors.push(
        `${expectedSnapshotName} has a missing or duplicate snapshot id.`,
      );
    }
    seenIds.add(snapshot.id);
    previousSnapshotId = snapshot.id;

    const tableCount = Object.keys(snapshot.tables ?? {}).length;
    const expectedCount = i;
    if (tableCount !== expectedCount) {
      errors.push(
        `${expectedSnapshotName} should contain ${expectedCount} tables, found ${tableCount}.`,
      );
    }
    if (tableCount < previousTableCount) {
      errors.push(
        `${expectedSnapshotName} loses tables from the previous snapshot.`,
      );
    }
    previousTableCount = tableCount;

    const enumCount = Object.keys(snapshot.enums ?? {}).length;
    const firstEnumCount = snapshotNames.length
      ? Object.keys(
          JSON.parse(
            readFileSync(resolve(metaFolder, "0000_snapshot.json"), "utf8"),
          ).enums ?? {},
        ).length
      : 0;
    if (enumCount !== firstEnumCount) {
      errors.push(
        `${expectedSnapshotName} enum set differs from the canonical enum baseline.`,
      );
    }

    for (const [tableKey, table] of Object.entries(snapshot.tables ?? {})) {
      for (const fk of Object.values(table.foreignKeys ?? {})) {
        const target = `public.${fk.tableTo}`;
        if (!(target in (snapshot.tables ?? {}))) {
          errors.push(
            `${expectedSnapshotName}: ${tableKey}.${fk.name} targets table not yet present: ${target}`,
          );
        }
      }
    }
  } catch (error) {
    errors.push(
      `Unable to parse ${expectedSnapshotName}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

const requiredSqlOnly = [
  [
    "0025_create_global_user_roles.sql",
    "CREATE TRIGGER global_user_roles_tenant_guard",
  ],
  [
    "0026_create_membership_roles.sql",
    "CREATE TRIGGER membership_roles_tenant_guard",
  ],
  [
    "0026_create_membership_roles.sql",
    "cross-tenant role assignment is forbidden",
  ],
  ["0043_create_audit_logs.sql", "CREATE TRIGGER audit_logs_immutable_update"],
  ["0043_create_audit_logs.sql", "CREATE TRIGGER audit_logs_immutable_delete"],
];
for (const [name, pattern] of requiredSqlOnly) {
  try {
    const sql = readFileSync(resolve(folder, name), "utf8");
    if (!sql.includes(pattern))
      errors.push(`${name} is missing required SQL-only invariant: ${pattern}`);
  } catch {
    errors.push(`Required canonical migration is missing: ${name}`);
  }
}

if (errors.length) {
  console.error("Migration integrity audit failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Migration integrity OK: ${sqlNames.length} atomic SQL/journal/snapshot units (${sqlNames[0]} → ${sqlNames.at(-1)}).`,
);
