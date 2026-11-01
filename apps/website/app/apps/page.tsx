import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { servoraApps } from "@/lib/servora-apps";
import { PageIntro } from "@/components/site/Primitives";
export const metadata = createPageMetadata(websitePageSeo.apps);
export default function Apps() {
  return (
    <>
      <PageIntro title="Open your workspace.">
        Already using Servora? Choose the application for your part of the
        restaurant.
      </PageIntro>
      <section
        className="container app-launcher"
        aria-label="Servora application launcher"
      >
        {servoraApps.map((app) => (
          <article key={app.key}>
            <app.icon aria-hidden="true" />
            <div>
              <h2>{app.name}</h2>
              <p>{app.description}</p>
              {app.key === "customer" ? (
                <p className="small-copy">
                  Guest ordering needs the restaurant's QR link and session
                  context.
                </p>
              ) : null}
            </div>
            <a className="action action-secondary" href={app.href}>
              Open {app.shortName} ↗
            </a>
          </article>
        ))}
      </section>
    </>
  );
}
