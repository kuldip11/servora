export type WebsitePageSeo = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  ogTitle: string;
  imageAlt?: string;
  index?: boolean;
  absoluteTitle?: boolean;
};

export const websitePageSeo = {
  home: {
    title: "Servora — Every order. Every team. One flow.",
    description:
      "Connect guest ordering, front of house, kitchen execution, billing and business control with Servora's restaurant operating platform.",
    path: "/",
    ogTitle: "Every order. Every team. One flow.",
    absoluteTitle: true,
  },
  product: {
    title: "Product",
    description:
      "Explore the connected restaurant operations capabilities in Servora.",
    path: "/product",
    ogTitle: "Restaurant operations, connected end to end.",
  },
  apps: {
    title: "Servora Apps",
    description:
      "Open the Servora management, kitchen, waiter and customer applications from one place.",
    path: "/apps",
    ogTitle: "One platform. The right workspace for every team.",
  },
  pricing: {
    title: "Pricing",
    description:
      "Talk to Servora about the right setup for your restaurant operation.",
    path: "/pricing",
    ogTitle: "A setup that fits your restaurant.",
  },
  demo: {
    title: "Book a Demo",
    description: "Request a Servora product walkthrough for your restaurant.",
    path: "/book-a-demo",
    ogTitle: "See Servora in your restaurant workflow.",
  },
  contact: {
    title: "Contact",
    description: "Contact the Servora team about your restaurant operation.",
    path: "/contact",
    ogTitle: "Let’s talk about your restaurant operation.",
  },
  login: {
    title: "Sign in",
    description: "Sign in to your Servora workspace.",
    path: "/login",
    ogTitle: "Servora sign in",
    index: false,
  },
  privacy: {
    title: "Privacy",
    description: "Servora privacy information.",
    path: "/legal/privacy",
    ogTitle: "Privacy Policy",
    index: false,
  },
  terms: {
    title: "Terms",
    description: "Servora terms information.",
    path: "/legal/terms",
    ogTitle: "Terms of Service",
    index: false,
  },
  cookies: {
    title: "Cookies",
    description: "Servora cookie information.",
    path: "/legal/cookies",
    ogTitle: "Cookie Policy",
    index: false,
  },
} satisfies Record<string, WebsitePageSeo>;
