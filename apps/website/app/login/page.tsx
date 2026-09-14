import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";

export const metadata = createPageMetadata(websitePageSeo.login);

export default function Login() {
  redirect(process.env.NEXT_PUBLIC_APP_SIGNIN_URL ?? "/app/login");
}
