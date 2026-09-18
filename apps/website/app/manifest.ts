import type { MetadataRoute } from "next";
import {
  BRAND_ASSETS,
  BRAND_COLORS,
  DEFAULT_DESCRIPTION,
  SITE_NAME,
} from "@pos/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: BRAND_COLORS.background,
    theme_color: BRAND_COLORS.primary,
    icons: [
      { src: BRAND_ASSETS.icon192, sizes: "192x192", type: "image/png" },
      { src: BRAND_ASSETS.icon512, sizes: "512x512", type: "image/png" },
      {
        src: BRAND_ASSETS.maskableIcon512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
