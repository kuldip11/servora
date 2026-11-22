import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const present = (path) => {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
};

export function readWorkspaces(root) {
  const manifest = readJson(join(root, "package.json"));
  const patterns = manifest.workspaces;
  if (!Array.isArray(patterns))
    throw new Error("Expected a workspace array in package.json.");
  const workspaces = [];
  for (const pattern of patterns) {
    if (!pattern.endsWith("/*") || pattern.slice(0, -2).includes("*"))
      throw new Error(`Unsupported workspace pattern: ${pattern}`);
    const parent = resolve(root, pattern.slice(0, -2));
    if (!parent.startsWith(root + sep))
      throw new Error("Workspace must be inside this repository.");
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const directory = join(parent, entry.name);
      if (!entry.isDirectory() || !existsSync(join(directory, "package.json")))
        continue;
      const pkg = readJson(join(directory, "package.json"));
      if (pkg.name) workspaces.push({ directory, manifest: pkg });
    }
  }
  return workspaces;
}

export function findCopiedWorkspaces(root, workspaces = readWorkspaces(root)) {
  const copies = [];
  for (const owner of [root, ...workspaces.map((w) => w.directory)]) {
    const modules = join(owner, "node_modules");
    // Do not modify an external dependency tree behind a directory symlink.
    if (!present(modules)?.isDirectory() || present(modules)?.isSymbolicLink())
      continue;
    for (const workspace of workspaces) {
      const name = workspace.manifest.name;
      const scope = name.startsWith("@")
        ? join(modules, name.split("/")[0])
        : modules;
      if (present(scope)?.isSymbolicLink()) continue;
      const candidate = join(modules, name);
      const info = present(candidate);
      if (!info?.isDirectory() || info.isSymbolicLink()) continue;
      const manifest = join(candidate, "package.json");
      if (existsSync(manifest) && readJson(manifest).name === name)
        copies.push(candidate);
    }
  }
  return copies;
}

export function backUpCopies(root, copies) {
  if (!copies.length) return undefined;
  const cache = join(root, ".cache");
  mkdirSync(cache, { recursive: true });
  const backup = mkdtempSync(join(cache, "workspace-copies-"));
  for (const source of copies) {
    const destination = join(backup, relative(root, source));
    mkdirSync(dirname(destination), { recursive: true });
    renameSync(source, destination);
  }
  return backup;
}

export function verifyWorkspaceResolution(
  root,
  workspaces = readWorkspaces(root),
) {
  const byName = new Map(workspaces.map((w) => [w.manifest.name, w.directory]));
  for (const owner of workspaces) {
    const require = createRequire(join(owner.directory, "package.json"));
    const deps = {
      ...owner.manifest.dependencies,
      ...owner.manifest.devDependencies,
    };
    for (const [name, version] of Object.entries(deps)) {
      if (!version.startsWith("workspace:")) continue;
      const expected = byName.get(name);
      if (!expected)
        throw new Error(`Unknown workspace ${name} in ${owner.manifest.name}.`);
      const actual = realpathSync(require.resolve(name));
      if (!actual.startsWith(realpathSync(expected) + sep))
        throw new Error(
          `${owner.manifest.name} resolves ${name} outside its source workspace: ${actual}`,
        );
    }
  }
  const contracts = byName.get("@pos/contracts");
  if (!contracts) throw new Error("Missing @pos/contracts workspace.");
  const require = createRequire(join(contracts, "package.json"));
  require.resolve("@sinclair/typebox");
  require.resolve("@sinclair/typebox/value");
}

export function setupWorkspace(root) {
  const workspaces = readWorkspaces(root);
  const copies = findCopiedWorkspaces(root, workspaces);
  const backup = backUpCopies(root, copies);
  if (backup)
    console.log(
      `Backed up ${copies.length} copied workspace package(s): ${backup}`,
    );
  const bun = process.versions.bun ? process.execPath : "bun";
  const result = spawnSync(bun, ["install"], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      "Dependency installation failed. Any moved copies remain in the printed backup directory.",
    );
  verifyWorkspaceResolution(root, workspaces);
  console.log(
    "Workspace links and TypeBox resolution verified. Start Servora with: bun run dev",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const root = resolve(process.cwd());
  try {
    setupWorkspace(root);
  } catch (error) {
    console.error(`Workspace setup failed: ${error.message}`);
    process.exitCode = 1;
  }
}
