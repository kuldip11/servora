"use client";

import dynamic from "next/dynamic";

const InteractiveProductDemos = dynamic(
  () =>
    import("./InteractiveProductDemos").then(
      (module) => module.InteractiveProductDemos,
    ),
  {
    ssr: false,
    loading: () => (
      <section
        id="interactive-demos"
        aria-busy="true"
        aria-label="Loading interactive product demos"
        className="bg-[#f6f2e8] py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="h-[560px] animate-pulse rounded-3xl border border-[#dcd8cd] bg-[#fffdf8]" />
        </div>
      </section>
    ),
  },
);

export const InteractiveProductDemosLazy = () => <InteractiveProductDemos />;
