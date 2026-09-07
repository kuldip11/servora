import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const permissionSql = read(
  "apps/api/src/db/migrations/0002_create_permissions.sql",
);
const roleSql = read(
  "apps/api/src/db/migrations/0024_create_role_permissions.sql",
);

const catalog = new Set(
  [...permissionSql.matchAll(/\('([^']+)'\s*,\s*'[^']+'\s*,/g)].map(
    (m) => m[1],
  ),
);

const permissionPrefixes = new Set([
  "analytics",
  "audit",
  "auth",
  "billing",
  "branch",
  "inventory",
  "kitchen",
  "menu",
  "orders",
  "organization",
  "permissions",
  "roles",
  "settings",
  "staff",
  "tables",
  "tenant",
]);

const runtimeRoots = [
  "apps/api/src/modules",
  "apps/api/src/core",
  "apps/web/src",
  "apps/waiter-app/src",
  "apps/kitchen-display/src",
];

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "test" ||
        entry.name === "tests" ||
        entry.name === "__tests__"
      )
        continue;
      walk(full);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.includes(".test.")
    ) {
      sourceFiles.push(full);
    }
  }
};
for (const relative of runtimeRoots) walk(path.join(root, relative));

const used = new Map();
const literal = /["']([a-z]+:[a-z_]+(?::[a-z_]+)*)["']/g;
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(literal)) {
    const key = match[1];
    if (!permissionPrefixes.has(key.split(":", 1)[0])) continue;
    const locations = used.get(key) ?? [];
    locations.push(path.relative(root, file));
    used.set(key, locations);
  }
}

const unknown = [...used.keys()].filter((key) => !catalog.has(key));
if (unknown.length) {
  console.error(
    "Permission audit failed: runtime references unseeded permission keys:",
  );
  for (const key of unknown.sort()) {
    console.error(`  ${key}: ${[...new Set(used.get(key))].join(", ")}`);
  }
  process.exit(1);
}

const rolePermissions = new Map();
for (const match of roleSql.matchAll(
  /WHERE r\."name" = '([^']+)'[^\n]*p\."key" IN \(([^;]+)\);/g,
)) {
  rolePermissions.set(
    match[1],
    new Set([...match[2].matchAll(/'([^']+)'/g)].map((m) => m[1])),
  );
}

const requireRolePermissions = {
  FRANCHISE_ADMIN: [
    "billing:create",
    "billing:read",
    "billing:refund",
    "menu:read",
    "menu:update",
    "orders:create",
    "orders:read",
    "orders:update",
    "orders:update_status",
    "staff:read",
    "settings:update",
    "tenant:update",
  ],
  MANAGER: [
    "billing:create",
    "orders:create",
    "orders:read",
    "orders:update",
    "kitchen:read",
    "kitchen:update",
    "menu:read",
    "tables:read",
  ],
  CHEF: ["kitchen:read", "kitchen:update", "menu:read", "orders:read"],
  WAITER: [
    "branch:read",
    "menu:read",
    "orders:create",
    "orders:read",
    "orders:update",
    "orders:update_status",
    "tables:read",
    "tables:update",
  ],
  CASHIER: ["billing:create", "billing:read", "billing:refund", "orders:read"],
  INVENTORY_MANAGER: [
    "inventory:create",
    "inventory:read",
    "inventory:update",
    "inventory:adjust",
    "inventory:waste",
  ],
  RECEPTIONIST: ["orders:read", "tables:read", "tables:update"],
  ACCOUNTANT: ["analytics:read", "billing:read"],
};

const forbiddenRolePermissions = {
  MANAGER: ["branch:archive", "billing:refund"],
  CHEF: [
    "orders:create",
    "orders:update",
    "orders:update_status",
    "billing:create",
  ],
  WAITER: ["kitchen:update", "billing:refund", "menu:update", "staff:update"],
  CASHIER: ["orders:update", "kitchen:update", "menu:update"],
  INVENTORY_MANAGER: ["orders:read", "menu:update", "billing:read"],
};

let failed = false;
for (const [role, required] of Object.entries(requireRolePermissions)) {
  const actual = rolePermissions.get(role);
  if (!actual) {
    console.error(`Permission audit failed: role ${role} is not seeded.`);
    failed = true;
    continue;
  }
  for (const key of required) {
    if (!actual.has(key)) {
      console.error(
        `Permission audit failed: ${role} is missing required ${key}.`,
      );
      failed = true;
    }
  }
}
for (const [role, forbidden] of Object.entries(forbiddenRolePermissions)) {
  const actual = rolePermissions.get(role) ?? new Set();
  for (const key of forbidden) {
    if (actual.has(key)) {
      console.error(`Permission audit failed: ${role} has over-broad ${key}.`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(
  `Permission audit OK: ${catalog.size} seeded permissions, ${used.size} runtime permission keys, and ${rolePermissions.size} system-role matrices verified.`,
);
