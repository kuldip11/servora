import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { DemoRequestForm } from "@/components/forms/DemoRequestForm";
export const metadata = createPageMetadata(websitePageSeo.demo);
export default function Demo() {
  return (
    <section className="form-layout">
      <div className="form-story">
        <h1>Bring your workflow.</h1>
        <p>
          See Servora through a service your team recognizes. Tell us about your
          operation and request a walkthrough.
        </p>
        <ul>
          <li>Follow an order from table to kitchen.</li>
          <li>Review menus, item choices and availability.</li>
          <li>Explore bills, staff access and branch context.</li>
        </ul>
      </div>
      <div className="form-panel">
        <DemoRequestForm />
      </div>
    </section>
  );
}
