import Link from "next/link";
import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
export const metadata = createPageMetadata(websitePageSeo.cookies);
export default function Cookies() {
  return (
    <section className="container legal-page">
      <h1>Cookie Policy</h1>
      <div>
        <p>
          This page is a launch placeholder and must be replaced with approved
          legal copy before public production launch.
        </p>
        <p>
          For questions about Servora,{" "}
          <Link className="text-link" href="/contact">
            contact the team
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
