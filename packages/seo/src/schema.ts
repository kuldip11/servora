type BreadcrumbItem = { name: string; path: string };

export const createOrganizationSchema = (baseUrl: string) => ({
  "@type": "Organization",
  name: "Servora",
  url: baseUrl,
  logo: `${baseUrl}/icon-512.png`,
});

export const createWebSiteSchema = (baseUrl: string) => ({
  "@type": "WebSite",
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
