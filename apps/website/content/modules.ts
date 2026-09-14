export type Module = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  capabilities: string[];
  capabilityDescriptions: string[];
  workflow: string[];
  roles: string[];
  related: string[];
};

export const modules: Module[] = [
  {
    slug: "pos-and-orders",
    name: "POS & Orders",
    eyebrow: "Front of house",
    description:
      "Keep orders moving from the counter or table to the right operational team.",
    capabilities: [
      "Order creation and management",
      "Tables and order context",
      "Order status workflows",
    ],
    capabilityDescriptions: [
      "Create and manage dine-in or counter orders while keeping the order record consistent from capture through service.",
      "Keep table, guest and order context together so front-of-house teams can act without switching between disconnected tools.",
      "Move orders through clear operational states that stay visible to the teams responsible for the next step.",
    ],
    workflow: [
      "Capture the order",
      "Keep table and order context together",
      "Move the order into the operational workflow",
    ],
    roles: ["Cashiers", "Managers", "Front-of-house teams"],
    related: ["qr-ordering", "kitchen-display", "billing-and-payments"],
  },
  {
    slug: "menu-management",
    name: "Menu Management",
    eyebrow: "Catalog",
    description:
      "Manage categories, items, modifiers, variants and availability from one place.",
    capabilities: [
      "Categories and menu items",
      "Modifiers and variants",
      "Availability and scheduling",
    ],
    capabilityDescriptions: [
      "Organize restaurant menus into clear categories and maintain item details from one connected catalog.",
      "Configure choices, add-ons and variants so guests and staff can build the right order without manual workarounds.",
      "Control when items are available so ordering surfaces reflect what the restaurant can actually serve.",
    ],
    workflow: [
      "Organize the catalog",
      "Configure item choices",
      "Control availability across operations",
    ],
    roles: ["Managers", "Menu operators", "Branch teams"],
    related: ["qr-ordering", "inventory", "multi-branch"],
  },
  {
    slug: "qr-ordering",
    name: "QR Ordering",
    eyebrow: "Customer experience",
    description:
      "Let guests browse the menu and place orders from their own devices.",
    capabilities: [
      "QR customer sessions",
      "Menu browsing and search",
      "Cart and order status",
    ],
    capabilityDescriptions: [
      "Start a table-aware ordering session from a restaurant QR code without requiring guests to install an app.",
      "Help guests find dishes quickly with a mobile-friendly menu experience connected to current restaurant availability.",
      "Let guests customize a cart, submit an order and follow its progress through the restaurant workflow.",
    ],
    workflow: [
      "Guest opens the QR experience",
      "Browses and customizes items",
      "Places and follows the order",
    ],
    roles: ["Guests", "Restaurant teams", "Managers"],
    related: ["pos-and-orders", "kitchen-display", "menu-management"],
  },
  {
    slug: "kitchen-display",
    name: "Kitchen Display",
    eyebrow: "Kitchen",
    description:
      "Give kitchen teams a focused view of tickets and order progress.",
    capabilities: ["Kitchen tickets", "Operational status", "Realtime updates"],
    capabilityDescriptions: [
      "Present incoming orders as focused kitchen tickets with the item context needed for preparation.",
      "Keep preparation stages clear so kitchen and front-of-house teams share the same view of order progress.",
      "Receive live order changes without relying on manual refreshes or verbal handoffs between teams.",
    ],
    workflow: [
      "Receive the ticket",
      "Work the kitchen queue",
      "Advance order status",
    ],
    roles: ["Kitchen staff", "Kitchen leads", "Managers"],
    related: ["pos-and-orders", "qr-ordering", "analytics"],
  },
  {
    slug: "billing-and-payments",
    name: "Billing & Payments",
    eyebrow: "Checkout",
    description:
      "Support restaurant billing workflows and the payment methods exposed by the product.",
    capabilities: [
      "Billing workflows",
      "Payment method support",
      "Refund workflows",
    ],
    capabilityDescriptions: [
      "Keep bill preparation connected to the underlying restaurant order instead of recreating checkout information separately.",
      "Record the payment methods supported by the operation while preserving the order and billing context.",
      "Handle supported refund flows with a traceable connection back to the original transaction and order.",
    ],
    workflow: [
      "Prepare the bill",
      "Record the supported payment flow",
      "Handle refund workflows when needed",
    ],
    roles: ["Cashiers", "Managers", "Finance teams"],
    related: ["pos-and-orders", "analytics", "multi-branch"],
  },
  {
    slug: "staff-and-roles",
    name: "Staff & Roles",
    eyebrow: "Team",
    description:
      "Organize staff access around restaurant roles and permissions.",
    capabilities: [
      "Staff management",
      "Role-based access",
      "Tenant and branch context",
    ],
    capabilityDescriptions: [
      "Maintain restaurant team members and operational access from one administrative workspace.",
      "Match permissions to restaurant responsibilities so staff see and perform the actions appropriate to their role.",
      "Keep access aligned with the correct organization, franchise and branch context in multi-location operations.",
    ],
    workflow: [
      "Manage team members",
      "Assign role-aware access",
      "Keep branch context aligned",
    ],
    roles: ["Owners", "Managers", "Staff administrators"],
    related: ["multi-branch", "security", "pos-and-orders"],
  },
  {
    slug: "inventory",
    name: "Inventory",
    eyebrow: "Operations",
    description:
      "Connect restaurant operations to inventory and recipe-aware workflows.",
    capabilities: ["Inventory management", "Recipes", "Availability workflows"],
    capabilityDescriptions: [
      "Track restaurant stock information alongside the operational workflows that consume it.",
      "Connect recipe definitions to menu and inventory context so ingredient usage is easier to reason about.",
      "Use stock and operational signals to support more accurate item availability decisions across ordering channels.",
    ],
    workflow: [
      "Maintain stock information",
      "Connect recipes to operations",
      "Use availability signals in workflows",
    ],
    roles: ["Managers", "Operations teams", "Kitchen teams"],
    related: ["menu-management", "analytics", "multi-branch"],
  },
  {
    slug: "analytics",
    name: "Analytics",
    eyebrow: "Insights",
    description: "Turn operational data into useful restaurant-level insights.",
    capabilities: [
      "Operational reporting",
      "Dashboard analytics",
      "Order and sales insights",
    ],
    capabilityDescriptions: [
      "Review restaurant activity through reports that stay connected to the same operational data used by the product.",
      "Bring important restaurant signals into dashboards that help managers understand current performance faster.",
      "Explore order and sales patterns to support day-to-day and branch-level decisions with better context.",
    ],
    workflow: [
      "Collect operational activity",
      "Review restaurant-level signals",
      "Use insights to guide decisions",
    ],
    roles: ["Owners", "Managers", "Operations teams"],
    related: ["pos-and-orders", "inventory", "multi-branch"],
  },
  {
    slug: "multi-branch",
    name: "Multi-Branch",
    eyebrow: "Scale",
    description:
      "Support restaurant organizations operating across branches and shared tenant context.",
    capabilities: ["Branch management", "Tenant context", "Role-aware access"],
    capabilityDescriptions: [
      "Organize multiple restaurant branches without losing the distinction between local operations and shared business control.",
      "Preserve tenant and franchise context as users move between locations and administrative workflows.",
      "Apply role-aware access across branches so permissions follow both responsibility and organizational scope.",
    ],
    workflow: [
      "Organize branches",
      "Keep tenant and branch context clear",
      "Apply role-aware access across the organization",
    ],
    roles: ["Owners", "Regional managers", "Multi-location operators"],
    related: ["staff-and-roles", "analytics", "menu-management"],
  },
  {
    slug: "security",
    name: "Security & Reliability",
    eyebrow: "Trust",
    description:
      "A trust layer built around authentication, authorization and responsible product claims.",
    capabilities: ["Authentication", "RBAC", "Tenant isolation architecture"],
    capabilityDescriptions: [
      "Require authenticated access before users enter operational Servora workspaces.",
      "Use role-based authorization to limit actions to the responsibilities assigned to each restaurant user.",
      "Keep tenant and branch context explicit in the application architecture to support isolation between restaurant organizations.",
    ],
    workflow: [
      "Authenticate users",
      "Authorize actions by role",
      "Keep tenant context isolated",
    ],
    roles: ["Owners", "Managers", "Administrators"],
    related: ["staff-and-roles", "multi-branch"],
  },
];

export const moduleBySlug = Object.fromEntries(
  modules.map((module) => [module.slug, module]),
);
