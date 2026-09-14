import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { DemoRequestForm } from "@/components/forms/DemoRequestForm";
export const metadata = createPageMetadata(websitePageSeo.demo);
export default function Demo() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">
          Book a Demo
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          See how Servora could fit your restaurant workflow.
        </h1>
        <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
          Tell us a little about your operation and use the walkthrough to focus
          on the workflows that matter most.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <DemoRequestForm />
      </div>
    </section>
  );
}
