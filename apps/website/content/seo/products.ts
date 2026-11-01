export type ProductSeo = {
  title: string;
  description: string;
  searchIntent: readonly string[];
};

export const productSeoBySlug = {
  "pos-and-orders": {
    title: "Restaurant POS and order management",
    description:
      "Keep restaurant orders moving from the counter or table into one connected operational workflow.",
    searchIntent: ["restaurant POS software", "restaurant order management"],
  },
  "menu-management": {
    title: "Restaurant menu management software",
    description:
      "Manage restaurant categories, items, modifiers, variants and availability from one connected system.",
    searchIntent: [
      "restaurant menu management software",
      "digital menu management",
    ],
  },
  "qr-ordering": {
    title: "Restaurant QR ordering system",
    description:
      "Let guests browse the menu and place orders from their phones with QR ordering connected to your kitchen and POS.",
    searchIntent: ["restaurant QR ordering system", "QR menu ordering"],
  },
  "kitchen-display": {
    title: "Restaurant kitchen display system",
    description:
      "Give kitchen teams a focused view of tickets, order progress and realtime operational updates.",
    searchIntent: ["restaurant kitchen display system", "restaurant KDS"],
  },
  "billing-and-payments": {
    title: "Restaurant POS billing and payments",
    description:
      "Support restaurant billing, payment methods and refund workflows within one connected operational platform.",
    searchIntent: ["restaurant billing software", "restaurant POS payments"],
  },
  "staff-and-roles": {
    title: "Restaurant staff and role management",
    description:
      "Manage restaurant staff access with role-based permissions and branch-aware operational context.",
    searchIntent: ["restaurant staff management", "restaurant POS roles"],
  },
  inventory: {
    title: "Restaurant inventory management software",
    description:
      "Connect restaurant stock, recipes and availability workflows to the rest of your daily operations.",
    searchIntent: [
      "restaurant inventory software",
      "restaurant stock management",
    ],
  },
  analytics: {
    title: "Restaurant analytics software",
    description:
      "Turn restaurant order and operational data into useful dashboards, reports and business insights.",
    searchIntent: [
      "restaurant analytics software",
      "restaurant reporting software",
    ],
  },
  "multi-branch": {
    title: "Multi-branch restaurant management software",
    description:
      "Manage branches, tenant context and role-aware workflows as your restaurant organization grows.",
    searchIntent: [
      "multi-location restaurant management",
      "multi-branch restaurant software",
    ],
  },
  security: {
    title: "Restaurant software security and access control",
    description:
      "Protect restaurant operations with authentication, role-based access and tenant isolation architecture.",
    searchIntent: ["restaurant POS security", "restaurant role based access"],
  },
} satisfies Record<string, ProductSeo>;
