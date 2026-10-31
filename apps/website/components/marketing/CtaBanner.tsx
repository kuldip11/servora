import { DemoLink } from "@/components/site/Section";
export function CtaBanner({
  title = "Bring your workflow.",
}: {
  title?: string;
}) {
  return (
    <section className="cta-board">
      <div>
        <h2>{title}</h2>
        <p>
          From the first order to the final bill, see how Servora fits the way
          your restaurant works.
        </p>
        <DemoLink />
      </div>
      <p>
        One restaurant or a growing group.
        <br />A walkthrough built around your service.
      </p>
    </section>
  );
}
