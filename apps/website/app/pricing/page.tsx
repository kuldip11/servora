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
      <section className="mt-14 space-y-6" aria-labelledby="quote-heading">
        <h2 id="quote-heading" className="text-2xl font-semibold">
          What to include in your pricing conversation
        </h2>
        <p>
          Tell us how many locations you operate, how orders reach the kitchen,
          and which teams need access. Your discussion can cover POS and
          billing, guest QR ordering, kitchen displays, inventory, reporting and
          branch management.
        </p>
        <h3 className="text-xl font-semibold">For one restaurant</h3>
        <p>
          Walk through a typical service: taking an order, sending it to the
          kitchen, changing items and settling the bill. Bring your menu
          structure and existing device or printer requirements.
        </p>
        <h3 className="text-xl font-semibold">For restaurant groups</h3>
        <p>
          Discuss shared menus, branch-specific availability, staff access and
          reporting across locations. Include the rollout order for your
          branches and any migration requirements.
        </p>
        <h3 className="text-xl font-semibold">Before agreeing a quote</h3>
        <p>
          Ask the team to confirm included capabilities, setup and training,
          support arrangements, compatible hardware, payment-provider charges
          and any recurring or one-time costs. These details should be agreed in
          your proposal.
        </p>
        <p>
          Want to see the workflow first?{" "}
          <a className="text-[var(--primary)] underline" href="/book-a-demo">
            Book a restaurant software demo
          </a>{" "}
          or{" "}
          <a className="text-[var(--primary)] underline" href="/product">
            explore the product capabilities
          </a>
          .
        </p>
      </section>
    </section>
  );
}
