export interface NavigationCommand {
  id: string;
  label: string;
  description: string;
  to: string;
  keywords: readonly string[];
  permission?: string;
}

export const NAVIGATION_COMMANDS: readonly NavigationCommand[] = [
  {
    id: "dashboard",
    label: "Open dashboard",
    description: "View restaurant performance and analytics",
    to: "/dashboard",
    keywords: ["home", "analytics", "metrics"],
    permission: "analytics:read",
  },
  {
    id: "operations",
    label: "Open operations center",
    description: "Review live operational exceptions and action signals",
    to: "/operations",
    keywords: ["operations", "alerts", "health", "exceptions"],
    permission: "analytics:read",
  },
  {
    id: "branch-health",
    label: "Open branch health",
    description: "Compare branch readiness and availability exceptions",
    to: "/branch-health",
    keywords: ["branch", "health", "readiness", "kds"],
    permission: "analytics:read",
  },
  {
    id: "orders",
    label: "Open orders",
    description: "Review and manage restaurant orders",
    to: "/orders",
    keywords: ["order", "kitchen", "status"],
    permission: "orders:read",
  },
  {
    id: "menu",
    label: "Open menu",
    description: "Manage menu items, categories, pricing and modifiers",
    to: "/menu",
    keywords: ["food", "item", "price", "modifier"],
    permission: "menu:read",
  },
  {
    id: "availability",
    label: "Open availability",
    description: "Review menu availability and schedules",
    to: "/availability",
    keywords: ["schedule", "unavailable", "stock"],
    permission: "menu:read",
  },
  {
    id: "inventory",
    label: "Open inventory",
    description: "Review stock, ingredients and movements",
    to: "/inventory",
    keywords: ["stock", "ingredient", "movement"],
    permission: "inventory:read",
  },
  {
    id: "staff",
    label: "Open staff",
    description: "Manage users, roles and permissions",
    to: "/staff",
    keywords: ["employee", "role", "permission"],
    permission: "staff:read",
  },
  {
    id: "business",
    label: "Open business",
    description: "Manage organization, franchise and branches",
    to: "/business",
    keywords: ["organization", "franchise", "branch"],
    permission: "branch:read",
  },
  {
    id: "audit",
    label: "Open audit log",
    description: "Inspect security and operational activity",
    to: "/audit",
    keywords: ["history", "security", "activity"],
    permission: "audit:read",
  },
  {
    id: "settings",
    label: "Open settings",
    description: "Configure your Servora workspace",
    to: "/settings",
    keywords: ["configuration", "preferences"],
  },
];
