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
    className="mt-7 block rounded-lg bg-[var(--primary)] px-4 py-3 text-center text-sm font-semibold text-white"
  >
    {cta}
  </TrackedLink>
);
