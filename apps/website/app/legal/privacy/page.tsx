import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
export const metadata = createPageMetadata(websitePageSeo.privacy);
export default function Privacy() {
  return (
    <Legal title="Privacy Policy">
      <p>
        This page is a launch placeholder and must be replaced with approved
        legal copy before public production launch.
      </p>
    </Legal>
  );
}
function Legal({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
      <p className="text-sm font-semibold text-[var(--primary)]">Legal</p>
      <h1 className="mt-3 text-4xl font-bold">{title}</h1>
      <div className="mt-8 space-y-5 text-sm leading-7 text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}
