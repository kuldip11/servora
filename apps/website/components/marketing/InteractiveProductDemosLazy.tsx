"use client";
import dynamic from "next/dynamic";
const InteractiveProductDemos = dynamic(
  () =>
    import("./InteractiveProductDemos").then((m) => m.InteractiveProductDemos),
  {
    ssr: false,
    loading: () => (
      <section id="interactive-demos" className="demo-section" aria-busy="true">
        <div className="demo-loading">
          <p>Loading interactive product demonstrations…</p>
          <a href="/product">Explore the product capabilities</a>
        </div>
      </section>
    ),
  },
);
export const InteractiveProductDemosLazy = () => <InteractiveProductDemos />;
