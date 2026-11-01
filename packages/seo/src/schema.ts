type BreadcrumbItem = { name: string; path: string };

export const createOrganizationSchema = (baseUrl: string) => ({
  "@type": "Organization",
  "@id": `${baseUrl}/#organization`,
  name: "Servora",
  url: baseUrl,
  logo: `${baseUrl}/icon-512.png`,
});

export const createWebSiteSchema = (baseUrl: string) => ({
  "@type": "WebSite",
  "@id": `${baseUrl}/#website`,
  publisher: { "@id": `${baseUrl}/#organization` },
  name: "Servora",
  url: baseUrl,
});

export const createSoftwareApplicationSchema = ({
  baseUrl,
  name,
  path,
  description,
}: {
  baseUrl: string;
  name: string;
  path: string;
  description: string;
}) => ({
  "@type": "SoftwareApplication",
  "@id": `${baseUrl}/#software`,
  publisher: { "@id": `${baseUrl}/#organization` },
  name,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: path ? `${baseUrl}${path}` : baseUrl,
  description,
});

export const createBreadcrumbSchema = (
  baseUrl: string,
  items: BreadcrumbItem[],
) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `${baseUrl}${item.path}`,
  })),
});

export const createFeaturePageSchema = (
  baseUrl: string,
  path: string,
  name: string,
  description: string,
) => ({
  "@type": "WebPage",
  "@id": `${baseUrl}${path}#webpage`,
  url: `${baseUrl}${path}`,
  name,
  description,
  isPartOf: { "@id": `${baseUrl}/#website` },
  about: { "@id": `${baseUrl}/#software` },
});

/** Escape HTML delimiters before embedding JSON inside a script element. */
export const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
