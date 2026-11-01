import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseIndexUnit,
  indexSnapshotErrors,
} from "./migration-index-unit.mjs";
const sql =
  'CREATE INDEX "orders_branch_idx" ON "orders" USING btree ("branch_id");';
const previous = {
  id: "a",
  prevId: "0",
  version: "7",
  tables: {
    "public.orders": { columns: { branch_id: { type: "uuid" } }, indexes: {} },
  },
  enums: {},
};
const current = () => ({
  ...structuredClone(previous),
  id: "b",
  prevId: "a",
  tables: {
    "public.orders": {
      columns: { branch_id: { type: "uuid" } },
      indexes: {
        orders_branch_idx: {
          name: "orders_branch_idx",
          columns: [
            {
              expression: "branch_id",
              isExpression: false,
              asc: true,
              nulls: "last",
            },
          ],
          isUnique: false,
          concurrently: false,
          method: "btree",
          with: {},
        },
      },
    },
  },
});
test("additive index unit preserves the entire preceding schema", () => {
  assert.deepEqual(
    indexSnapshotErrors(previous, current(), parseIndexUnit(sql)),
    [],
  );
});
test("index unit rejects destructive or unrelated SQL", () => {
  for (const bad of [
    sql + " DROP TABLE orders;",
    "ALTER TABLE orders ADD COLUMN x text;",
    sql + sql,
  ])
    assert.throws(() => parseIndexUnit(bad));
});
test("index metadata must match the SQL and existing columns", () => {
  const next = current();
  next.tables["public.orders"].indexes.orders_branch_idx.isUnique = true;
  assert.ok(indexSnapshotErrors(previous, next, parseIndexUnit(sql)).length);
  assert.ok(
    indexSnapshotErrors(previous, current(), [
      { name: "x", table: "missing", column: "branch_id" },
    ]).length,
  );
});
test("index-only units cannot smuggle column or enum changes", () => {
  const next = current();
  next.tables["public.orders"].columns.branch_id.type = "text";
  assert.ok(
    indexSnapshotErrors(previous, next, parseIndexUnit(sql)).some((x) =>
      x.includes("more than"),
    ),
  );
});
