import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { PricingCta } from "@/components/marketing/PricingCta";
export const metadata = createPageMetadata(websitePageSeo.pricing);
export default function Pricing() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--primary)]">Pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          A setup that fits your restaurant.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--text-secondary)]">
          Pricing can depend on your restaurant setup, number of locations and
          operational requirements. Talk to the team for a tailored
          conversation.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          [
            "Single location",
            "For an individual restaurant",
            "Discuss your requirements",
          ],
          [
            "Multi-location",
            "For growing restaurant groups",
            "Plan your branch setup",
          ],
          ["Enterprise", "For larger operations", "Talk to the team"],
        ].map(([title, desc, cta]) => (
          <div
            key={title}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7"
          >
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--text-secondary)]">
              {desc}
            </p>
            <p className="mt-7 text-2xl font-bold">Contact Sales</p>
            <PricingCta planName={title} cta={cta} />
          </div>
        ))}
      </div>
    </section>
  );
}
