import type { Metadata } from "next";
import {
  assertCanonicalPath,
  BRAND_ASSETS,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_TITLE,
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  normalizeOrigin,
  SITE_NAME,
  TWITTER_CARD,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
} from "@pos/seo";

export {
  BRAND_ASSETS,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_TITLE,
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  SITE_NAME,
};

export const getSiteUrl = () =>
  normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL);

export const getAbsoluteUrl = (path: string) =>
  `${getSiteUrl()}${assertCanonicalPath(path)}`;

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  ogTitle?: string;
  imageAlt?: string;
  index?: boolean;
  absoluteTitle?: boolean;
};

// Nested social metadata is replaced per segment; include complete image defaults.
export const createPageMetadata = ({
  title,
  description,
  path,
  ogTitle = title,
  imageAlt = "Servora restaurant operations platform",
  index = true,
  absoluteTitle = false,
}: PageMetadataInput): Metadata => {
  assertCanonicalPath(path);
  const socialTitle = title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: index ? { canonical: path } : undefined,
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true, nosnippet: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      url: path,
      images: [
        {
          url: "/opengraph-image.png",
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: TWITTER_CARD,
      title: socialTitle,
      images: [{ url: "/twitter-image.png", alt: imageAlt }],
      description,
    },
  };
};
