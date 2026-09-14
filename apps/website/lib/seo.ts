import type { Metadata } from "next";
import {
  assertCanonicalPath,
  BRAND_ASSETS,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_TITLE,
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  normalizeOrigin,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_NAME,
  TWITTER_CARD,
} from "@pos/seo";

export {
  BRAND_ASSETS,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_TITLE,
  DEFAULT_SITE_URL,
  DEFAULT_TITLE,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  SITE_NAME,
};

export const getSiteUrl = () =>
  normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL);

export const getAbsoluteUrl = (path: string) => `${getSiteUrl()}${path}`;

export const getOgImageUrl = ({
  title = DEFAULT_OG_TITLE,
  eyebrow = SITE_NAME,
}: {
  title?: string;
  eyebrow?: string;
} = {}) => {
  const params = new URLSearchParams({ title, eyebrow });
  return `/og?${params.toString()}`;
};

type PageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
  ogTitle?: string;
  ogEyebrow?: string;
  imageAlt?: string;
  index?: boolean;
  absoluteTitle?: boolean;
  staticImage?: boolean;
};

export const createPageMetadata = ({
  title,
  description,
  path,
  ogTitle = title,
  ogEyebrow = SITE_NAME,
  imageAlt = `${title} — ${SITE_NAME}`,
  index = true,
  absoluteTitle = false,
  staticImage = true,
}: PageMetadataInput): Metadata => {
  assertCanonicalPath(path);
  const imagePath = staticImage
    ? BRAND_ASSETS.websiteOg
    : getOgImageUrl({ title: ogTitle, eyebrow: ogEyebrow });
  const image = getAbsoluteUrl(imagePath);
  const socialTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: index ? { canonical: path } : undefined,
    robots: index
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true, nosnippet: true },
    openGraph: {
      type: "website", siteName: SITE_NAME, title: socialTitle, description, url: path,
      images: [
        {
          url: image,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: imageAlt,
          type: "image/png",
        },
      ],
    },
    twitter: { card: TWITTER_CARD, title: socialTitle, description, images: [image] },
  };
};
