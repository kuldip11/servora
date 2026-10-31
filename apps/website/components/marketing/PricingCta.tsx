import { TrackedLink } from "@/components/analytics/TrackedLink";

export const PricingCta = ({
  planName,
  cta,
}: {
  planName: string;
  cta: string;
}) => (
  <TrackedLink
    tracking={{ kind: "pricing", planName }}
    href="/book-a-demo"
    className="text-link"
  >
    {cta}
  </TrackedLink>
);
