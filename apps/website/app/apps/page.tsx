import { createPageMetadata } from "@/lib/seo";
import { websitePageSeo } from "@/content/seo";
import { ArrowUpRight } from "lucide-react";
import { servoraApps } from "@/lib/servora-apps";

export const metadata = createPageMetadata(websitePageSeo.apps);

export default function AppsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-[var(--primary)]">
          Application ecosystem
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          One platform. The right workspace for every team.
        </h1>
        <p className="mt-5 text-lg leading-8 text-[var(--text-secondary)]">
          Open the Servora workspace designed for the job at hand. Each
          destination is configured through environment variables, so the
          website stays deployment-safe across local, staging and production
          environments.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {servoraApps.map((app) => {
          const Icon = app.icon;
          return (
            <a
              key={app.key}
              href={app.href}
              className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 transition hover:border-[var(--primary-border)] hover:shadow-[var(--shadow-md)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-xl bg-[var(--primary-surface)] p-3 text-[var(--primary)]">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="text-[var(--text-secondary)] transition group-hover:text-[var(--primary)]"
                  size={20}
                  aria-hidden="true"
                />
              </div>
              <h2 className="mt-6 text-xl font-semibold">{app.name}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {app.description}
              </p>
              <span className="mt-5 inline-block text-sm font-semibold text-[var(--primary)]">
                Open {app.shortName}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
