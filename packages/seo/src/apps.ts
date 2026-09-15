export type ServoraAppId = "website" | "web" | "waiter" | "kitchen" | "customer";

export type ServoraAppSeo = {
  id: ServoraAppId;
  name: string;
  title: string;
  description: string;
  indexable: boolean;
  ogEyebrow: string;
  ogHeadline: string;
  ogDescription: string;
};

export const SERVORA_APPS: Record<ServoraAppId, ServoraAppSeo> = {
  website: {
    id: "website",
    name: "Servora",
    title: "Servora — Restaurant operations, connected.",
    description: "Connected restaurant operations software for orders, kitchens, teams, inventory, analytics and customer ordering.",
    indexable: true,
    ogEyebrow: "SERVORA",
    ogHeadline: "Every order. Every team. One flow.",
    ogDescription: "Restaurant operations, connected from guest order to kitchen and business insight.",
  },
  web: {
    id: "web",
    name: "Servora Business",
    title: "Servora — Business",
    description: "Servora business operations, point of sale and restaurant administration.",
    indexable: false,
    ogEyebrow: "SERVORA BUSINESS",
    ogHeadline: "Run the restaurant from one connected workspace.",
    ogDescription: "Orders, menus, teams, inventory, analytics and administration in Servora Business.",
  },
  waiter: {
    id: "waiter",
    name: "Servora Waiter",
    title: "Servora — Waiter",
    description: "Servora waiter ordering and table-service workspace.",
    indexable: false,
    ogEyebrow: "SERVORA WAITER",
    ogHeadline: "Faster table service. Fewer handoffs.",
    ogDescription: "Take orders, manage tables and keep service moving with Servora Waiter.",
  },
  kitchen: {
    id: "kitchen",
    name: "Servora Kitchen",
    title: "Servora — Kitchen",
    description: "Servora kitchen display workspace for restaurant order preparation.",
    indexable: false,
    ogEyebrow: "SERVORA KITCHEN",
    ogHeadline: "Every ticket. Clear priorities. One kitchen flow.",
    ogDescription: "Keep preparation visible, ordered and connected with Servora Kitchen.",
  },
  customer: {
    id: "customer",
    name: "Servora Customer",
    title: "Servora — Order at your table",
    description: "Servora table ordering for restaurant guests.",
    indexable: false,
    ogEyebrow: "SERVORA CUSTOMER",
    ogHeadline: "Scan. Order. Enjoy.",
    ogDescription: "A simple table-ordering experience connected directly to restaurant operations.",
  },
};
