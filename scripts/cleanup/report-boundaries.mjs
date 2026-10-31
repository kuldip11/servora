import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

const roots = ["apps", "packages"];
const findings = [];
const importPattern = /(?:from\s+|import\s*(?:\(\s*)?)["']([^"']+)["']/g;
let scannedFiles = 0;

const normalize = (path) => path.replaceAll("\\", "/");
const featureFromPath = (path) =>
  normalize(path).match(/^apps\/([^/]+)\/src\/features\/([^/]+)/);

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      [
        "node_modules",
        "dist",
        "coverage",
        ".turbo",
        ".next",
        "generated",
      ].includes(entry.name)
    )
      continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if ([".ts", ".tsx"].includes(extname(entry.name))) await inspect(path);
  }
}

async function inspect(path) {
  if (
    /\.(?:test|spec)\.[^.]+$/.test(path) ||
    /[/\\](?:test|tests|__tests__)[/\\]/.test(path)
  )
    return;

  scannedFiles += 1;
  const source = await readFile(path, "utf8");
  const file = normalize(relative(process.cwd(), path));
  const currentFeatureMatch = featureFromPath(file);
  const currentApp = currentFeatureMatch?.[1];
  const currentFeature = currentFeatureMatch?.[2];
  const isLowLevelShared = /^apps\/[^/]+\/src\/shared\/(?:auth|lib)\//.test(
    file,
  );

  for (const match of source.matchAll(importPattern)) {
    const target = match[1];
    const aliasedFeature = target.match(/^@\/features\/([^/]+)(\/.+)$/);

    if (
      aliasedFeature &&
      !aliasedFeature[2].startsWith("/public/") &&
      (!currentFeature || aliasedFeature[1] !== currentFeature)
    ) {
      findings.push(
        `${file}: external code must import ${aliasedFeature[1]} through @/features/${aliasedFeature[1]} or its public entry points: ${target}`,
      );
    }

    if (isLowLevelShared && target.startsWith("@/features/")) {
      findings.push(
        `${file}: low-level shared code cannot depend on a feature: ${target}`,
      );
    }

    if (/^@pos\/[^/]+\/src\//.test(target)) {
      findings.push(
        `${file}: workspace package internals are private; use the package export: ${target}`,
      );
    }

    if (target.startsWith(".") && currentApp) {
      const resolvedTarget = normalize(
        relative(process.cwd(), resolve(dirname(path), target)),
      );
      const relativeFeature = featureFromPath(resolvedTarget);
      const hasInternalPath =
        relativeFeature && relativeFeature[0] !== resolvedTarget;
      if (
        relativeFeature &&
        hasInternalPath &&
        (relativeFeature[1] !== currentApp ||
          relativeFeature[2] !== currentFeature)
      ) {
        findings.push(
          `${file}: relative import crosses into ${relativeFeature[2]} internals: ${target}`,
        );
      }
    }
  }
}

for (const root of roots) await walk(root);

if (!findings.length) {
  console.log(
    `Dependency boundaries verified (${scannedFiles} production TypeScript files scanned).`,
  );
} else {
  console.error(
    "Dependency-boundary violations found. Cross-feature consumers must use public entry points, low-level shared code must remain feature-independent, and workspace package source paths are private:",
  );
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
