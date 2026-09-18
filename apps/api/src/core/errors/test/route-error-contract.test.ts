import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "src", "modules");

const routeFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return /\.(route|router)\.ts$/.test(entry) ? [path] : [];
  });

describe("API route error contract", () => {
  const files = routeFiles(root);

  it("covers every route module with the centralized error boundary", () => {
    expect(files.length).toBeGreaterThanOrEqual(35);
  });

  it.each(files.map((file) => [relative(root, file), file] as const))(
    "%s does not handcraft frontend failure bodies",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/success\s*:\s*false/);
      expect(source).not.toMatch(/message\s*:\s*error\.message/);
      expect(source).not.toMatch(/details\s*:\s*error\.message/);
      expect(source).not.toMatch(/stack\s*:/);
    },
  );
});
