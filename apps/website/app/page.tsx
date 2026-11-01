import Link from "next/link";
import { createPageMetadata, getSiteUrl } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import {
  createOrganizationSchema,
  createSoftwareApplicationSchema,
  createWebSiteSchema,
  serializeJsonLd,
} from "@pos/seo";
import { ProductFigure } from "@/components/site/ProductFigure";
import { ProductTour } from "@/components/site/ProductTour";
import { Action, ClosingCta } from "@/components/site/Primitives";
import { Faq } from "@/components/site/Faq";
import { TableMark } from "@/components/brand/Brand";
export const metadata = createPageMetadata(websitePageSeo.home);
export default function Home() {
  const base = getSiteUrl();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              createOrganizationSchema(base),
              createSoftwareApplicationSchema({
                baseUrl: base,
                name: "Servora",
                path: "",
                description: websitePageSeo.home.description,
              }),
              createWebSiteSchema(base),
            ],
          }),
        }}
      />
      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <h1>
              Restaurant POS.
              <br />
              One shared shift.
            </h1>
            <p>
              Take the order. Keep the kitchen and floor in the loop. Give every
              part of your restaurant a clear view of service.
            </p>
            <div className="hero-actions">
              <Action />
              <Action href="/demo" secondary>
                Try the workflow
              </Action>
            </div>
            <p className="hero-note">
              For the people taking orders, preparing food and running the
              restaurant.
            </p>
          </div>
          <div className="hero-product">
            <div className="table-field" aria-hidden="true" />
            <ProductFigure kind="pos" priority />
          </div>
        </div>
      </section>
      <section className="opening-statement container">
        <TableMark />
        <h2>
          Good service is
          <br />a team effort.
        </h2>
        <p>
          An item choice at the table becomes preparation work in the kitchen, a
          ready order on the floor and a bill to review. Servora keeps the
          context with the work.
        </p>
      </section>
      <ProductTour />
      <section className="service-story">
        <div className="container story-layout">
          <div>
            <h2>
              Less retelling.
              <br />
              More serving.
            </h2>
            <p>
              A kitchen note should not need a second explanation. Ready food
              should have a table to go to. Give your team the information for
              the next handoff.
            </p>
            <Action href="/product/kitchen-display" secondary>
              Follow the kitchen handoff
            </Action>
          </div>
          <div className="story-evidence">
            <ProductFigure kind="waiter" />
            <p>
              Ready food, bill requests and active orders have a place in the
              floor team's attention view.
            </p>
          </div>
        </div>
      </section>
      <section className="management-section container">
        <div className="section-heading">
          <h2>
            Behind the shift.
            <br />
            Within reach.
          </h2>
          <p>
            Keep the menu, bills and operating context connected to the service
            your team delivers.
          </p>
        </div>
        <div className="capability-links">
          {[
            [
              "menu-management",
              "Keep choices and availability clear.",
              "Menus, variants, modifiers and availability.",
            ],
            [
              "billing-and-payments",
              "Bring the bill into the conversation.",
              "Financial summaries and supported bill splits.",
            ],
            [
              "inventory",
              "Know what goes into the menu.",
              "Stock information, recipes and operational effects.",
            ],
            [
              "multi-branch",
              "Work in the right restaurant context.",
              "Business, branch and role-aware management.",
            ],
          ].map(([slug, title, description]) => (
            <Link key={slug} href={`/product/${slug}`}>
              <h3>{title}</h3>
              <p>{description}</p>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
        <Link href="/product" className="text-link">
          Explore all management capabilities →
        </Link>
      </section>
      <section className="playground-callout container">
        <div>
          <h2>
            Take a table
            <br />
            through service.
          </h2>
          <p>
            Try the local playground. Explore guest choices, kitchen progress
            and the floor's next action with sample data.
          </p>
          <Action href="/demo">Open the playground</Action>
        </div>
        <ProductFigure kind="kitchen" />
      </section>
      <Faq />
      <ClosingCta />
    </>
  );
}
