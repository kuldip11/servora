import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type EndpointAuthMode = "bearer" | "public" | "customer-session" | "metrics-token" | "webhook";
export interface ApiEndpointManifestEntry {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  source: string;
  authMode: EndpointAuthMode;
  hasPathParams: boolean;
  hasBody: boolean;
  hasQuery: boolean;
}

const routeFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return routeFiles(path);
    return /\.(route|router)\.ts$/.test(entry) ? [path] : [];
  });

const authModeFor = (path: string): EndpointAuthMode => {
  if (path === "/metrics") return "metrics-token";
  if (path === "/api/webhooks/razorpay") return "webhook";
  if (path === "/api/telemetry/frontend" || path.startsWith("/health")) return "public";
  if (["/api/auth/signup", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout"].includes(path)) return "public";
  if (path === "/api/customer/sessions") return "public";
  if (path.startsWith("/api/customer/")) return "customer-session";
  return "bearer";
};

const normalizePath = (prefix: string, route: string) => {
  const value = `${prefix}${route}`.replace(/\/{2,}/g, "/");
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
};

const scanFile = (root: string, file: string): ApiEndpointManifestEntry[] => {
  const source = readFileSync(file, "utf8");
  const prefix = source.match(/new Elysia\(\{\s*prefix:\s*["']([^"']+)["']/)?.[1] ?? "";
  const routePattern = /(?<![A-Za-z0-9_$\]])\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/gi;
  const matches = [...source.matchAll(routePattern)];
  return matches.map((match, index) => {
    const method = match[1]!.toUpperCase() as ApiEndpointManifestEntry["method"];
    const path = normalizePath(prefix, match[2]!);
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    const chunk = source.slice(start, end);
    return {
      id: `${method} ${path}`,
      method,
      path,
      source: relative(root, file),
      authMode: authModeFor(path),
      hasPathParams: path.includes(":"),
      hasBody: /\bbody\b/.test(chunk) || /body\s*:/.test(chunk),
      hasQuery: /\bquery\b/.test(chunk) || /query\s*:/.test(chunk),
    };
  });
};

export const getApiEndpointManifest = (): ApiEndpointManifestEntry[] => {
  const srcRoot = join(process.cwd(), "src");
  const files = [
    ...routeFiles(join(srcRoot, "modules")),
    join(srcRoot, "core", "observability", "frontend-telemetry.route.ts"),
    join(srcRoot, "core", "observability", "metrics.route.ts"),
  ];
  const endpoints = files.flatMap((file) => scanFile(srcRoot, file));
  const indexSource = readFileSync(join(srcRoot, "index.ts"), "utf8");
  for (const match of indexSource.matchAll(/\.get\(\s*["'](\/health(?:\/[^"']*)?)["']/g)) {
    const path = match[1]!;
    endpoints.push({
      id: `GET ${path}`,
      method: "GET",
      path,
      source: "index.ts",
      authMode: "public",
      hasPathParams: false,
      hasBody: false,
      hasQuery: false,
    });
  }
  return endpoints.sort((a, b) => a.id.localeCompare(b.id));
};

export const materializeEndpointPath = (path: string) =>
  path.replace(/:[A-Za-z0-9_]+/g, "00000000-0000-4000-8000-000000000001");
