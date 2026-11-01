import { TrackedLink } from "@/components/analytics/TrackedLink";
import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { products, workspaces, workspaceSlugs } from "@/content/product";
import { PageIntro, Action, ClosingCta } from "@/components/site/Primitives";
import { ProductFigure } from "@/components/site/ProductFigure";
export const metadata = createPageMetadata(websitePageSeo.product);
export default function ProductPage() {
  return (
    <>
      <PageIntro title="Every role. One restaurant." action>
        Explore four workspaces around one restaurant operation, then look at
        the management controls behind the shift.
      </PageIntro>
      <section
        className="container workspace-directory"
        aria-label="Product workspaces"
      >
        {workspaces.map((p) => (
          <article
            key={p.slug}
            className={`workspace-row workspace-${p.capture}`}
          >
            <div>
              <h2>{p.name}</h2>
              <p>{p.intro}</p>
              <Action href={`/product/${p.slug}`} secondary>
                Explore {p.name.toLowerCase()}
              </Action>
            </div>
            <ProductFigure kind={p.capture!} />
          </article>
        ))}
      </section>
      <section className="container management-directory">
        <h2>The controls behind service.</h2>
        <div>
          {products
            .filter((p) => !workspaceSlugs.includes(p.slug))
            .map((p) => (
              <TrackedLink
                href={`/product/${p.slug}`}
                key={p.slug}
                tracking={{ kind: "module", moduleSlug: p.slug }}
              >
                <h3>{p.name}</h3>
                <p>{p.intro}</p>
                <span aria-hidden="true">↗</span>
              </TrackedLink>
            ))}
        </div>
      </section>
      <ClosingCta />
    </>
  );
}
