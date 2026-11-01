import { isDeepStrictEqual } from "node:util";

/** Only additive, plain-column btree indexes are accepted in an index-only unit. */
export function parseIndexUnit(sql) {
  const statements = sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!statements.length) throw new Error("Index migration is empty");
  const seen = new Set();
  return statements.map((statement) => {
    const match = statement.match(
      /^CREATE INDEX "([a-z0-9_]+)" ON "([a-z0-9_]+)" USING btree \("([a-z0-9_]+)"\)$/i,
    );
    if (!match)
      throw new Error(
        "Index-only migration may contain only additive plain-column CREATE INDEX statements",
      );
    const [, name, table, column] = match;
    if (seen.has(name)) throw new Error(`Duplicate index: ${name}`);
    seen.add(name);
    return { name, table, column };
  });
}

export function indexSnapshotErrors(previous, current, indexes) {
  const errors = [];
  const restored = structuredClone(current);
  for (const { name, table, column } of indexes) {
    const oldTable = previous.tables?.[`public.${table}`];
    const nextTable = restored.tables?.[`public.${table}`];
    if (!oldTable || !nextTable || !oldTable.columns?.[column]) {
      errors.push(`Index ${name} must target an existing table and column`);
      continue;
    }
    if (oldTable.indexes?.[name])
      errors.push(`Index ${name} already exists in the previous snapshot`);
    const expected = {
      name,
      columns: [
        { expression: column, isExpression: false, asc: true, nulls: "last" },
      ],
      isUnique: false,
      concurrently: false,
      method: "btree",
      with: {},
    };
    if (!isDeepStrictEqual(nextTable.indexes?.[name], expected))
      errors.push(`Index ${name} SQL and snapshot do not match`);
    delete nextTable.indexes?.[name];
  }
  const old = structuredClone(previous);
  delete old.id;
  delete old.prevId;
  delete restored.id;
  delete restored.prevId;
  if (!isDeepStrictEqual(old, restored))
    errors.push("Index-only snapshot changes more than its declared indexes");
  return errors;
}
