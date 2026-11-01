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
    title: "Restaurant POS for a shared view of service | Servora",
    description:
      "Connect restaurant orders, kitchen preparation, floor service and management. Explore Servora's real product views and try the local workflow playground.",
    path: "/",
    ogTitle: "Restaurant POS. One shared shift.",
    absoluteTitle: true,
  },
  product: {
    title: "Restaurant POS and operations workspaces",
    description:
      "Explore Servora's POS, kitchen, waiter and guest ordering workspaces, with the menu, billing and management controls behind restaurant service.",
    path: "/product",
    ogTitle: "A place for every part of service.",
  },
  apps: {
    title: "Open your Servora application",
    description:
      "Open the management, kitchen, waiter or customer application for your restaurant. Guest ordering requires restaurant QR and session context.",
    path: "/apps",
    ogTitle: "Open your restaurant workspace.",
  },
  pricing: {
    title: "Discuss your restaurant setup and pricing",
    description:
      "Discuss your restaurant workflow, workspaces, branches and requirements with Servora. Confirm scope, configuration and commercial terms for your setup.",
    path: "/pricing",
    ogTitle: "Start with your restaurant.",
  },
  demo: {
    title: "Request a restaurant product walkthrough",
    description:
      "Request a Servora walkthrough focused on your restaurant's ordering, kitchen, floor and management needs. Tell the team what you want to explore.",
    path: "/book-a-demo",
    ogTitle: "See your service in Servora.",
  },
  contact: {
    title: "Contact the Servora team",
    description:
      "Contact Servora about a restaurant setup, product question or support enquiry. Share your context and the workflow you would like to discuss.",
    path: "/contact",
    ogTitle: "What's on your table?",
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
