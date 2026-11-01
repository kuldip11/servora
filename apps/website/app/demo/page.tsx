import { createPageMetadata } from "@/lib/seo";
import { PageIntro, ClosingCta } from "@/components/site/Primitives";
import { WorkflowDemoLazy } from "@/components/playground/WorkflowDemoLazy";
export const metadata = createPageMetadata({
  title: "Try the restaurant workflow",
  description:
    "Explore Servora's guest ordering, kitchen preparation, waiter attention and POS context in a local sample playground. No live orders or payments.",
  path: "/demo",
  ogTitle: "Take a sample table through service.",
});
export default function Demo() {
  return (
    <>
      <PageIntro title="Take a table through service.">
        Try the handoff from an order to the kitchen and floor. The workspaces
        below share local sample state, so you can see what changes next.
      </PageIntro>
      <section
        className="container playground-page"
        aria-label="Interactive product playground"
      >
        <WorkflowDemoLazy />
      </section>
      <ClosingCta />
    </>
  );
}
