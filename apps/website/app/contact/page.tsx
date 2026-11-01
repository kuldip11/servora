import Link from "next/link";
import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { ContactForm } from "@/components/forms/ContactForm";
import { TableMark } from "@/components/brand/Brand";
export const metadata = createPageMetadata(websitePageSeo.contact);
export default function Contact() {
  return (
    <section className="container form-page contact-page">
      <div className="form-story">
        <TableMark />
        <h1>
          What's on
          <br />
          your table?
        </h1>
        <p className="lead">
          A new restaurant, a question about your operation, or something your
          team needs help with. Tell us what you'd like to discuss.
        </p>
        <p>
          Want to explore the product first?
          <br />
          <Link className="text-link" href="/demo">
            Try the local workflow →
          </Link>
        </p>
      </div>
      <div className="form-panel">
        <h2>Send the team a message</h2>
        <p>Choose a subject and give us the relevant context.</p>
        <ContactForm />
      </div>
    </section>
  );
}
