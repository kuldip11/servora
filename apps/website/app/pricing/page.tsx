import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { PageIntro } from "@/components/site/Section";
import { PricingCta } from "@/components/marketing/PricingCta";
export const metadata = createPageMetadata(websitePageSeo.pricing);
export default function Pricing() {
  return (
    <>
      <PageIntro
        title="Scope your setup."
        aside={
          <p className="statement">
            Start with the way your restaurant works. Build the proposal around
            it.
          </p>
        }
      >
        <p>
          Servora pricing is discussed with the team. Your locations, workflows
          and rollout requirements shape the conversation.
        </p>
      </PageIntro>
      <section className="pricing-worksheet">
        <div className="pricing-scope">
          <h2>Your operation.</h2>
          {[
            [
              "Single restaurant",
              "Walk through a typical service: taking an order, sending it to the kitchen, changing items and settling the bill.",
            ],
            [
              "Restaurant group",
              "Review shared menus, branch availability, staff permissions and reporting across locations.",
            ],
            [
              "Larger rollout",
              "Discuss your migration, training, support and rollout sequence with the team before agreeing the scope.",
            ],
          ].map(([title, body]) => (
            <article className="pricing-row" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
              <PricingCta planName={title} cta="Discuss this setup" />
            </article>
          ))}
        </div>
        <div className="quote-note">
          <h2>A clear proposal.</h2>
          <p>
            Bring your menu structure, location count and current devices. Ask
            the team to confirm:
          </p>
          <ul>
            <li>
              Which POS, QR ordering, kitchen, inventory and reporting
              capabilities are included.
            </li>
            <li>Setup, data migration, training and support arrangements.</li>
            <li>
              Compatible hardware, printers and any additional requirements.
            </li>
            <li>Payment-provider charges and supported payment methods.</li>
            <li>Recurring fees, one-time costs and the rollout schedule.</li>
          </ul>
          <p>
            Pricing and terms should be confirmed in your proposal. Confirm
            included capabilities and all costs with the team before choosing
            your setup.
          </p>
        </div>
      </section>
    </>
  );
}
