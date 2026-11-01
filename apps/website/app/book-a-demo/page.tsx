import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { DemoRequestForm } from "@/components/forms/DemoRequestForm";
import { ProductFigure } from "@/components/site/ProductFigure";
export const metadata = createPageMetadata(websitePageSeo.demo);
export default function DemoRequest() {
  return (
    <section className="container form-page">
      <div className="form-story">
        <h1>
          See your service
          <br />
          in Servora.
        </h1>
        <p className="lead">
          Tell us what your restaurant needs. Request a walkthrough focused on
          the team, tables and workflows you want to connect.
        </p>
        <ul>
          <li>Follow an order into the kitchen.</li>
          <li>Look at the floor team's next action.</li>
          <li>Review menu, bill and management context.</li>
        </ul>
        <ProductFigure kind="waiter" />
      </div>
      <div className="form-panel">
        <h2>Request a walkthrough</h2>
        <p>Share your details and the questions you want to explore.</p>
        <DemoRequestForm />
        <p className="small-copy">
          This sends an enquiry to the Servora team. It does not reserve a
          calendar time.
        </p>
      </div>
    </section>
  );
}
