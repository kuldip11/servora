import { defineConfig } from "../../apps/web/node_modules/vite/dist/node/index.js";
import { createRequire } from "node:module";
import preset from "../../packages/ui/tailwind-preset.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, "../..");
const require = createRequire(path.join(repo, "apps/website/package.json"));
const tailwind = require("tailwindcss");
const autoprefixer = require("autoprefixer");
export default defineConfig({
  root,
  esbuild: { jsx: "automatic" },
  plugins: [{ name: "application-local-aliases", enforce: "pre", resolveId(id, importer) {
    if (!id.startsWith("@/") || !importer) return;
    const app = importer.match(/\/apps\/([^/]+)\//)?.[1];
    if (app) return this.resolve(path.join(repo, "apps", app, "src", id.slice(2)), importer, { skipSelf: true });
  }}],
  css: { postcss: { plugins: [tailwind({ presets: [preset], content: [path.join(root, "*.tsx"),path.join(repo,"apps/{web,waiter-app,customer-app,kitchen-display}/src/**/*.{ts,tsx}"),path.join(repo,"packages/ui/src/**/*.{ts,tsx}")] }), autoprefixer()] } },
  server: { fs: { allow: [repo] } },
});
