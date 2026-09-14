import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata = createPageMetadata(websitePageSeo.contact);

export default function Contact() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-[var(--primary)]">Contact</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Let’s talk about your restaurant operation.
        </h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          Tell us what you need and the team can follow up with the right
          context.
        </p>
      </div>
      <div className="mt-10 max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <ContactForm />
      </div>
    </section>
  );
}
