import type { MetadataRoute } from "next";
import { websitePageSeo } from "@/content/seo";
import { BRAND_ASSETS, SITE_NAME } from "@pos/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: websitePageSeo.home.description,
    start_url: "/",
    display: "standalone",
    background_color: "#eef0f3",
    theme_color: "#1f2de6",
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
