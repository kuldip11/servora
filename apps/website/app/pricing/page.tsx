import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { PageIntro, ClosingCta } from "@/components/site/Primitives";
import { PricingAction } from "@/components/site/PricingAction";
export const metadata = createPageMetadata(websitePageSeo.pricing);
export default function Pricing() {
  return (
    <>
      <PageIntro title="Start with your restaurant.">
        The right setup begins with how your team serves. Talk through your
        workspaces, branches and requirements before agreeing commercial terms.
      </PageIntro>
      <section className="container pricing-layout">
        <div className="pricing-conversation">
          <h2>What should we plan around?</h2>
          <ul>
            <li>
              <strong>Your service</strong>
              <p>Dine-in, takeaway and the way your team takes orders.</p>
            </li>
            <li>
              <strong>Your workspaces</strong>
              <p>Management/POS, kitchen, floor and guest ordering.</p>
            </li>
            <li>
              <strong>Your context</strong>
              <p>Branches, staff responsibilities and menu operations.</p>
            </li>
            <li>
              <strong>Your requirements</strong>
              <p>
                Payment configuration, deployment needs and the workflows to
                validate.
              </p>
            </li>
          </ul>
        </div>
        <div className="pricing-next">
          <h2>
            A walkthrough.
            <br />
            Then a clear proposal.
          </h2>
          <p>
            We don't publish fixed plan prices here. Use the enquiry to
            establish scope, availability and the commercial terms for your
            restaurant.
          </p>
          <PricingAction />
          <p className="small-copy">
            No purchase or payment is taken on this page. A demo request does
            not automatically book a calendar appointment.
          </p>
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
