import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { ContactForm } from "@/components/forms/ContactForm";
export const metadata = createPageMetadata(websitePageSeo.contact);
export default function Contact() {
  return (
    <section className="form-layout">
      <div className="form-story">
        <h1>Let’s talk service.</h1>
        <p>
          Tell us about your restaurant, your team and the work you want to
          connect.
        </p>
        <ul>
          <li>Discuss a new restaurant setup.</li>
          <li>Explore a multi-branch operation.</li>
          <li>Ask about an existing Servora workflow.</li>
        </ul>
      </div>
      <div className="form-panel">
        <ContactForm />
      </div>
    </section>
  );
}
