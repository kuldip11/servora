export type Capture = "pos" | "kitchen" | "waiter" | "customer" | "billing";
export type Product = {
  slug: string;
  name: string;
  title: string;
  intro: string;
  question: string;
  answer: string;
  audience: string;
  capture?: Capture;
  layout: "split" | "wide" | "phone" | "guide";
  features: { title: string; body: string }[];
  steps: string[];
  boundary?: string;
  related: string[];
};
export const products: Product[] = [
  {
    slug: "pos-and-orders",
    name: "POS & orders",
    title: "Take the order. Keep the context.",
    intro:
      "Restaurant POS for the details that matter: the table, the choices, the notes and the next team to act.",
    question: "What happens after ‘I'll have…’ ?",
    answer:
      "An order is more than a list of dishes. Keep its table and item details together as your team takes the order, sends kitchen work and gets the bill ready.",
    audience: "For cashiers, managers and front-of-house teams.",
    capture: "pos",
    layout: "split",
    features: [
      {
        title: "Hold the detail",
        body: "Choose menu items, variants and modifiers. Keep quantities and preparation notes with the items they belong to.",
      },
      {
        title: "Keep service context",
        body: "Work with dine-in and takeaway orders. For dine-in service, keep the table attached to the order.",
      },
      {
        title: "Make the next handoff",
        body: "Fire kitchen work, follow its progress and continue into billing without recreating the order record.",
      },
    ],
    steps: [
      "Take the items and guest choices.",
      "Send the kitchen its preparation work.",
      "Review the order and move into billing.",
    ],
    related: ["kitchen-display", "billing-and-payments", "menu-management"],
  },
  {
    slug: "kitchen-display",
    name: "Kitchen display",
    title: "The next ticket, clearly.",
    intro:
      "A kitchen workspace for the order, its preparation details and the state of the work.",
    question: "What needs cooking now?",
    answer:
      "Give the kitchen its own view. Tickets bring together items, quantities, choices and notes, so preparation moves through clear states while the floor follows the handoff.",
    audience: "For kitchen teams and station operators.",
    capture: "kitchen",
    layout: "wide",
    features: [
      {
        title: "Details intact",
        body: "See quantities, variants, modifiers and chef notes together. Void and urgency feedback call attention to work that needs care.",
      },
      {
        title: "A queue for your station",
        body: "Use the station filter to focus on relevant preparation work rather than every ticket in the restaurant.",
      },
      {
        title: "A clear ready state",
        body: "Move fired work into preparation and mark it ready. Ready-ticket context is available in the floor team's attention view.",
      },
    ],
    steps: [
      "Receive the fired kitchen ticket.",
      "Start preparation for the station.",
      "Mark the ticket ready for service.",
    ],
    related: ["waiter-app", "pos-and-orders"],
  },
  {
    slug: "waiter-app",
    name: "Waiter app",
    title: "Know the next table action.",
    intro:
      "A focused floor workspace for taking orders, seeing ready food and responding to guest requests.",
    question: "Which table needs you?",
    answer:
      "The floor needs an actionable view, not the entire back office. Bring ready orders, active tables and guest requests into a workspace built around the next service action.",
    audience: "For waiters and the floor team.",
    capture: "waiter",
    layout: "phone",
    features: [
      {
        title: "See ready food",
        body: "Orders with ready kitchen tickets appear in the attention view, with the table and order context needed to act.",
      },
      {
        title: "Respond to requests",
        body: "Review guest and bill requests, then resolve the relevant service task.",
      },
      {
        title: "Take the table's order",
        body: "Browse the menu, choose item options and create an order or add items to an existing one.",
      },
    ],
    steps: [
      "Check ready food and guest requests.",
      "Open the relevant table or order.",
      "Take the next service action.",
    ],
    related: ["kitchen-display", "qr-ordering", "pos-and-orders"],
  },
  {
    slug: "qr-ordering",
    name: "Guest QR ordering",
    title: "Their table. Their choices.",
    intro:
      "Let guests explore the menu, customize an order and follow its progress through a restaurant QR session.",
    question: "What can a guest do from the table?",
    answer:
      "A QR link establishes restaurant and table context. Guests can find a dish, choose available options, review their cart and place an order without losing that context.",
    audience:
      "For guests, with restaurant-controlled menus and session access.",
    capture: "customer",
    layout: "phone",
    features: [
      {
        title: "Explore the menu",
        body: "Search dishes and browse categories. The restaurant's menu defines available items, variants and customization options.",
      },
      {
        title: "Review before ordering",
        body: "Collect choices in the cart, adjust quantities and check the order before submitting it.",
      },
      {
        title: "Follow service",
        body: "Track the placed order and send supported service requests. Checkout depends on the configured session and payment setup.",
      },
    ],
    steps: [
      "Open the restaurant's QR session.",
      "Choose items and review the cart.",
      "Place the order and follow its status.",
    ],
    boundary:
      "Guest ordering needs restaurant QR/session context. A generic application link is not a live restaurant menu.",
    related: ["menu-management", "waiter-app", "pos-and-orders"],
  },
  {
    slug: "menu-management",
    name: "Menu management",
    title: "Make every choice clear.",
    intro:
      "Keep categories, items, options and availability together in the management workspace.",
    question: "What can your restaurant serve?",
    answer:
      "Your menu shapes what staff and guests can order. Manage its structure and choices alongside the availability rules that influence ordering.",
    audience: "For managers and authorized menu teams.",
    layout: "guide",
    features: [
      {
        title: "Build the structure",
        body: "Organize categories and items, then work with variants, modifiers and menu membership where the restaurant uses them.",
      },
      {
        title: "Define the choices",
        body: "Keep a dish's available choices with its item record, so orders carry relevant customization into preparation.",
      },
      {
        title: "Review availability",
        body: "Work with availability and overrides alongside stock and recipe-related operating context.",
      },
    ],
    steps: [
      "Organize menu items and choices.",
      "Review prices and availability settings.",
      "Check what the ordering teams can offer.",
    ],
    related: ["qr-ordering", "inventory", "pos-and-orders"],
  },
  {
    slug: "billing-and-payments",
    name: "Billing & payments",
    title: "Finish with a clear bill.",
    intro:
      "Keep the order, its totals and supported split allocations connected through settlement.",
    question: "How should this table settle?",
    answer:
      "Review the financial record before collection. Servora includes order bills and even, item-based and seat-based split workflows, with validation and permissions behind them.",
    audience: "For authorized cashiers and managers.",
    capture: "billing",
    layout: "split",
    features: [
      {
        title: "Review the totals",
        body: "See subtotal, tax, supported service charge, discounts and rounding in the order financial summary.",
      },
      {
        title: "Choose the split",
        body: "Use even splits, item allocations or seat-based bills. Shared-item handling is part of the supported seat workflow.",
      },
      {
        title: "Collect in context",
        body: "Collection and refund flows use the bill/order record and authorization checks. Gateway use requires configuration.",
      },
    ],
    steps: [
      "Review the financial summary.",
      "Choose a supported split when needed.",
      "Collect or review payment in context.",
    ],
    boundary:
      "Payment-provider availability, credentials and commercial terms must be confirmed for your setup. No payment is processed by the website playground.",
    related: ["pos-and-orders", "staff-and-roles"],
  },
  {
    slug: "inventory",
    name: "Inventory & recipes",
    title: "Behind every dish.",
    intro:
      "Connect stock information and recipes to the restaurant's operational work.",
    question: "What goes into the dish?",
    answer:
      "Inventory and recipe workflows give managers a place to consider ingredients and menu operations together.",
    audience: "For managers and authorized inventory teams.",
    layout: "guide",
    features: [
      {
        title: "Maintain ingredient records",
        body: "Review stock information and the changes supported by the inventory workflow.",
      },
      {
        title: "Connect recipes",
        body: "Recipe and sub-recipe services relate ingredients, usage and cost to menu context.",
      },
      {
        title: "Review the effects",
        body: "Deduction and availability services connect inventory events to ordering. Review the configured behavior for your restaurant.",
      },
    ],
    steps: [
      "Maintain ingredient and stock information.",
      "Connect the relevant recipe definitions.",
      "Review changes and availability context.",
    ],
    related: ["menu-management", "analytics"],
  },
  {
    slug: "staff-and-roles",
    name: "Staff & roles",
    title: "Tools for each responsibility.",
    intro:
      "Organize staff access around roles, permissions and restaurant context.",
    question: "Who needs to do what?",
    answer:
      "Protected application routes and API operations check permissions. Keep access aligned with the jobs your team performs.",
    audience: "For owners, managers and authorized administrators.",
    layout: "guide",
    features: [
      {
        title: "Maintain the team",
        body: "Create and update staff records through the authorized management workflow.",
      },
      {
        title: "Define responsibilities",
        body: "Roles and permissions describe the actions a user can access; routes check the relevant permission.",
      },
      {
        title: "Keep context explicit",
        body: "Tenant and branch context participate in the authenticated operating model. Access is more than choosing a screen.",
      },
    ],
    steps: [
      "Identify each team member's responsibilities.",
      "Assign appropriate roles and permissions.",
      "Review access in the business context.",
    ],
    related: ["security", "multi-branch"],
  },
  {
    slug: "analytics",
    name: "Reports & analytics",
    title: "Look closer at the operation.",
    intro:
      "Bring management questions to the dashboard, menu analysis and branch reporting areas.",
    question: "What should you review next?",
    answer:
      "Reporting areas help authorized teams review recorded restaurant activity. Use the relevant business and branch context to interpret what the records show.",
    audience: "For owners and managers with reporting access.",
    layout: "guide",
    features: [
      {
        title: "Review activity",
        body: "The dashboard and analytics endpoints provide a place to review recorded business activity.",
      },
      {
        title: "Investigate the menu",
        body: "The menu-engineering area supports a focused view of menu performance.",
      },
      {
        title: "Keep branches in view",
        body: "Branch-health and operations areas support location-aware review where access is permitted.",
      },
    ],
    steps: [
      "Select the business or branch context.",
      "Open the relevant reporting area.",
      "Investigate an operational question.",
    ],
    boundary:
      "Sample figures are not customer results. No financial outcome or prediction engine is promised.",
    related: ["multi-branch", "inventory"],
  },
  {
    slug: "multi-branch",
    name: "Multi-branch management",
    title: "Each location, in context.",
    intro:
      "Work with business, tenant and branch context across the management application.",
    question: "Which restaurant are you working in?",
    answer:
      "Organization, tenant and branch workflows keep operating context explicit, helping authorized teams act in the right place.",
    audience: "For owners and managers responsible for multiple branches.",
    layout: "guide",
    features: [
      {
        title: "Organize the business",
        body: "Use the supported organization, tenant and branch operations in business management.",
      },
      {
        title: "Select the context",
        body: "The application carries active business and branch context into protected work.",
      },
      {
        title: "Review operations",
        body: "Branch-health and reporting areas support authorized location-aware operational review.",
      },
    ],
    steps: [
      "Review the business and branches.",
      "Select the context for the work.",
      "Manage and review the authorized operation.",
    ],
    boundary:
      "Branch-aware implementation does not imply a franchise contract, enterprise SLA or global compliance guarantee.",
    related: ["staff-and-roles", "analytics"],
  },
  {
    slug: "security",
    name: "Access & security",
    title: "Access with a purpose.",
    intro:
      "Authentication, permissions and business context shape access to restaurant work.",
    question: "What protects a staff action?",
    answer:
      "Application routes and backend authorization participate in controlling access. These are implementation facts, not an external certification or a substitute for deployment review.",
    audience: "For teams evaluating access responsibilities.",
    layout: "guide",
    features: [
      {
        title: "Authenticate staff",
        body: "Protected routes and API handlers require the appropriate authenticated session.",
      },
      {
        title: "Check permissions",
        body: "Roles and permission checks govern access to management capabilities and service operations.",
      },
      {
        title: "Scope the work",
        body: "Tenant and branch context associate requests with the relevant restaurant operation.",
      },
    ],
    steps: [
      "Authenticate the staff member.",
      "Check the action and its permission.",
      "Keep business context attached.",
    ],
    boundary:
      "No independent certification, uptime guarantee or production security audit is claimed.",
    related: ["staff-and-roles", "multi-branch"],
  },
];
export const workspaceSlugs = [
  "pos-and-orders",
  "kitchen-display",
  "waiter-app",
  "qr-ordering",
];
export const workspaces = workspaceSlugs.map((slug) =>
  products.find((p) => p.slug === slug)!,
);
export const findProduct = (slug: string) =>
  products.find((p) => p.slug === slug)!;
