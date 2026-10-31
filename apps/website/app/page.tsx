import Link from "next/link";
import {
  createOrganizationSchema,
  createSoftwareApplicationSchema,
  createWebSiteSchema,
  serializeJsonLd,
} from "@pos/seo";
import { createPageMetadata, getSiteUrl } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { ProductSurface } from "@/components/site/ProductSurface";
import { DemoLink } from "@/components/site/Section";
import { InteractiveProductDemosLazy } from "@/components/marketing/InteractiveProductDemosLazy";
import { CtaBanner } from "@/components/marketing/CtaBanner";
export const metadata = createPageMetadata(websitePageSeo.home);
const faqs = [
  [
    "What is Servora?",
    "Servora is restaurant management software with workspaces for management and POS, waiters, kitchen teams and guest QR ordering. Menus, order context, billing and branch operations connect those workflows.",
  ],
  [
    "Can guests place an order from a QR code?",
    "Yes. The customer application uses a QR session to show the menu, support item choices and place orders. It also includes order status and guest service requests.",
  ],
  [
    "How does the kitchen receive orders?",
    "Kitchen tickets carry item details and preparation context. Kitchen staff work with stations and ticket statuses; service teams can see when food is ready.",
  ],
  [
    "Can we manage more than one branch?",
    "Servora has organization and branch context, branch-aware permissions and menu availability controls. Use a walkthrough to review the setup your restaurant group needs.",
  ],
  [
    "Is the interactive demo connected to a restaurant?",
    "The website demos use illustrative sample data and local state. They demonstrate individual workflows without placing real orders, collecting payments or changing a restaurant's records.",
  ],
  [
    "How do we get pricing?",
    "Request a demo or contact the team. Discuss locations, required workflows, onboarding, support and hardware needs before agreeing your proposal.",
  ],
];
export default function HomePage() {
  const base = getSiteUrl();
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      createOrganizationSchema(base),
      createWebSiteSchema(base),
      createSoftwareApplicationSchema({
        baseUrl: base,
        name: "Servora",
        path: "",
        description: websitePageSeo.home.description,
      }),
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }}
      />
      <section
        className="hero-board"
        aria-label="Servora restaurant management software"
      >
        <div className="hero-copy">
          <h1>
            Service,
            <br />
            in sync.
          </h1>
          <p>
            Servora is restaurant management software connecting your guests,
            floor team, kitchen and back office.
          </p>
          <DemoLink />
          <Link className="text-link" href="#interactive-demos">
            Try the product
          </Link>
          <p className="hero-note">
            Illustrative interfaces · Sample restaurant data
          </p>
        </div>
        <div className="hero-management">
          <ProductSurface kind="management" />
        </div>
        <div className="hero-kitchen">
          <ProductSurface kind="kitchen" />
        </div>
        <div className="hero-guest">
          <ProductSurface kind="customer" />
        </div>
      </section>
      <section className="story-intro">
        <h2>Follow the order.</h2>
        <p className="statement">
          An order starts with a guest. It moves through your floor, reaches the
          kitchen and becomes a bill. Servora keeps the operational context
          together.
        </p>
        <div className="workflow-notes">
          <p>
            <strong>At the table.</strong> Guests browse and customize from a QR
            session, or your team takes the order.
          </p>
          <p>
            <strong>On the floor.</strong> Waiters work with table context,
            ready orders and guest requests.
          </p>
          <p>
            <strong>In the kitchen.</strong> Tickets show what to prepare, with
            modifiers, notes and progress.
          </p>
          <p>
            <strong>Across the business.</strong> Managers work with menus,
            bills, staff, stock and branch reports.
          </p>
        </div>
      </section>
      <section className="service-board">
        <div className="service-board-copy">
          <h2>The floor has a view.</h2>
          <p>
            Ready orders and guest requests belong beside the table they came
            from. Give the service team a focused workspace for the next action.
          </p>
          <Link className="text-link" href="/apps">
            Explore the workspaces
          </Link>
        </div>
        <ProductSurface kind="waiter" />
      </section>
      <section
        className="capability-board"
        aria-labelledby="capabilities-heading"
      >
        <div className="capability-title">
          <h2 id="capabilities-heading">Behind the service.</h2>
          <p>The tools to keep tomorrow’s menu, stock and team ready.</p>
          <Link href="/product" className="text-link">
            All product capabilities
          </Link>
        </div>
        <Link href="/product/menu-management" className="capability-media">
          <ProductSurface kind="menu" />
          <span>Menus & availability</span>
        </Link>
        <Link href="/product/billing-and-payments" className="capability-media">
          <ProductSurface kind="billing" />
          <span>Billing & payments</span>
        </Link>
        <Link href="/product/inventory" className="capability-media">
          <ProductSurface kind="inventory" />
          <span>Inventory & recipes</span>
        </Link>
      </section>
      <InteractiveProductDemosLazy />
      <section className="faq-layout">
        <h2>Before we talk.</h2>
        <div>
          {faqs.map(([question, answer]) => (
            <details key={question} name="product-questions">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <CtaBanner />
    </>
  );
}
