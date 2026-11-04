import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  symlinkSync,
  existsSync,
  lstatSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import {
  backUpCopies,
  findCopiedWorkspaces,
  verifyWorkspaceResolution,
} from "../setup-workspace.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
function write(path, data) {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, data);
}
function fixture() {
  const root = mkdtempSync(join(process.cwd(), ".setup-test-"));
  roots.push(root);
  write(
    join(root, "package.json"),
    JSON.stringify({ workspaces: ["apps/*", "packages/*"] }),
  );
  write(
    join(root, "apps/demo/package.json"),
    JSON.stringify({
      name: "@pos/demo",
      dependencies: { "@pos/contracts": "workspace:*" },
    }),
  );
  write(
    join(root, "packages/contracts/package.json"),
    JSON.stringify({ name: "@pos/contracts", main: "src/index.js" }),
  );
  write(join(root, "packages/contracts/src/index.js"), "module.exports = {};");
  return root;
}
function typebox(root) {
  const base = join(root, "packages/contracts/node_modules/@sinclair/typebox");
  write(
    join(base, "package.json"),
    JSON.stringify({
      name: "@sinclair/typebox",
      exports: { ".": "./index.js", "./value": "./value.js" },
    }),
  );
  write(join(base, "index.js"), "module.exports = {};");
  write(join(base, "value.js"), "module.exports = {};");
}
test("backs up copied workspace trees and preserves source, env and unrelated packages", () => {
  const root = fixture();
  const copy = join(root, "apps/demo/node_modules/@pos/contracts");
  write(join(copy, "package.json"), JSON.stringify({ name: "@pos/contracts" }));
  write(join(copy, "local.txt"), "preserve");
  write(join(root, "apps/demo/.env"), "LOCAL=keep");
  write(join(root, "apps/demo/node_modules/other/package.json"), "{}");
  const copies = findCopiedWorkspaces(root);
  assert.deepEqual(copies, [copy]);
  const backup = backUpCopies(root, copies);
  assert.ok(
    existsSync(join(backup, "apps/demo/node_modules/@pos/contracts/local.txt")),
  );
  assert.ok(!existsSync(copy));
  assert.ok(existsSync(join(root, "apps/demo/.env")));
  assert.ok(
    existsSync(join(root, "apps/demo/node_modules/other/package.json")),
  );
  assert.ok(existsSync(join(root, "packages/contracts/src/index.js")));
});
test("keeps legitimate workspace symlinks and verifies dependency resolution", () => {
  const root = fixture();
  const scope = join(root, "apps/demo/node_modules/@pos");
  mkdirSync(scope, { recursive: true });
  const link = join(scope, "contracts");
  symlinkSync(join(root, "packages/contracts"), link, "dir");
  typebox(root);
  assert.deepEqual(findCopiedWorkspaces(root), []);
  assert.ok(lstatSync(link).isSymbolicLink());
  verifyWorkspaceResolution(root);
});
test("rejects a shadow workspace even if its package.json and main look valid", () => {
  const root = fixture();
  const copy = join(root, "apps/demo/node_modules/@pos/contracts");
  write(
    join(copy, "package.json"),
    JSON.stringify({ name: "@pos/contracts", main: "index.js" }),
  );
  write(join(copy, "index.js"), "module.exports = {};");
  typebox(root);
  assert.throws(
    () => verifyWorkspaceResolution(root),
    /outside its source workspace/,
  );
});
test("does not mutate dependency trees behind a node_modules directory symlink", () => {
  const root = fixture();
  const external = join(root, "external-dependencies");
  write(
    join(external, "@pos/contracts/package.json"),
    JSON.stringify({ name: "@pos/contracts" }),
  );
  symlinkSync(external, join(root, "apps/demo/node_modules"), "dir");
  assert.deepEqual(findCopiedWorkspaces(root), []);
});
