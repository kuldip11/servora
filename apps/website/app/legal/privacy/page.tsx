import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
export const metadata = createPageMetadata(websitePageSeo.privacy);
export default function LegalPage() {
  return (
    <section className="legal-page">
      <h1>Privacy Policy</h1>
      <p>
        This page is a launch placeholder and must be replaced with approved
        legal copy before public production launch.
      </p>
      <p>
        For questions about Servora,{" "}
        <a className="text-link" href="/contact">
          contact the team
        </a>
        .
      </p>
    </section>
  );
}
