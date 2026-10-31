import type { SurfaceKind } from "@/components/site/ProductSurface";
export const presentation: Record<
  string,
  {
    title: string;
    kind: SurfaceKind;
    layout: "split" | "portrait" | "wide";
    question: string;
  }
> = {
  "waiter-app": {
    title: "Service on the floor.",
    kind: "waiter",
    layout: "portrait",
    question: "What does the table need?",
  },
  "pos-and-orders": {
    title: "Restaurant POS.",
    kind: "management",
    layout: "split",
    question: "Keep the order together.",
  },
  "menu-management": {
    title: "Menu management.",
    kind: "menu",
    layout: "split",
    question: "Make every choice clear.",
  },
  "qr-ordering": {
    title: "QR table ordering.",
    kind: "customer",
    layout: "portrait",
    question: "From scan to kitchen.",
  },
  "kitchen-display": {
    title: "Kitchen display.",
    kind: "kitchen",
    layout: "wide",
    question: "What needs cooking next?",
  },
  "billing-and-payments": {
    title: "Billing & payments.",
    kind: "billing",
    layout: "portrait",
    question: "Keep settlement connected.",
  },
  "staff-and-roles": {
    title: "Staff & roles.",
    kind: "access",
    layout: "split",
    question: "Access follows the job.",
  },
  inventory: {
    title: "Restaurant inventory.",
    kind: "inventory",
    layout: "split",
    question: "Ingredients meet the menu.",
  },
  analytics: {
    title: "Restaurant analytics.",
    kind: "analytics",
    layout: "wide",
    question: "Review the decisions ahead.",
  },
  "multi-branch": {
    title: "Multi-branch control.",
    kind: "branches",
    layout: "split",
    question: "Local context. Shared control.",
  },
  security: {
    title: "Access with context.",
    kind: "access",
    layout: "split",
    question: "Scope every responsibility.",
  },
};
