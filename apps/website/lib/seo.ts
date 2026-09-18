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

export const getAbsoluteUrl = (path: string) => `${getSiteUrl()}${path}`;

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  ogTitle?: string;
  imageAlt?: string;
  index?: boolean;
  absoluteTitle?: boolean;
};

/**
 * Builds page-specific metadata while deliberately leaving social image
 * selection to Next.js file-based metadata (`app/opengraph-image.png` and
 * `app/twitter-image.png`). Next.js gives file-based metadata higher priority
 * and emits the image URL, type, width and height automatically.
 */
export const createPageMetadata = ({
  title,
  description,
  path,
  ogTitle = title,
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
    },
    twitter: {
      card: TWITTER_CARD,
      title: socialTitle,
      description,
    },
  };
};
