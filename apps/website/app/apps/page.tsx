import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { servoraApps } from "@/lib/servora-apps";
import { PageIntro } from "@/components/site/Section";
import {
  ProductSurface,
  type SurfaceKind,
} from "@/components/site/ProductSurface";
export const metadata = createPageMetadata(websitePageSeo.apps);
const surfaces: Record<string, SurfaceKind> = {
  web: "management",
  kitchen: "kitchen",
  waiter: "waiter",
  customer: "customer",
};
export default function AppsPage() {
  return (
    <>
      <PageIntro title="Your place in service.">
        <p>
          Open the workspace for your role. Management, kitchen, service and
          guests each have a view built for their part of the operation.
        </p>
      </PageIntro>
      <section className="apps-directory" aria-label="Servora applications">
        {servoraApps.map((app) => (
          <article key={app.key} className="app-entry">
            <div>
              <h2>{app.name}</h2>
              <p>{app.description}</p>
              <a href={app.href} className="text-link">
                Open {app.shortName}
              </a>
            </div>
            <div aria-hidden="true">
              <ProductSurface kind={surfaces[app.key]} />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
