"use client";
import { useRef, useState } from "react";
import { workspaces } from "@/content/product";
import { ProductFigure } from "./ProductFigure";
import { Action } from "./Primitives";
export function ProductTour() {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const product = workspaces[active]!;
  return (
    <section className="product-tour container" id="product-tour">
      <div className="section-heading">
        <h2>
          One order.
          <br />
          Four clear views.
        </h2>
        <p>
          Explore each part of service through real Servora components, captured
          with sample data.
        </p>
      </div>
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Explore Servora workspaces"
      >
        {workspaces.map((p, i) => (
          <button
            key={p.slug}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`workspace-${i}`}
            aria-controls="workspace-panel"
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              let next = i;
              if (event.key === "ArrowRight")
                next = (i + 1) % workspaces.length;
              else if (event.key === "ArrowLeft")
                next = (i + workspaces.length - 1) % workspaces.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = workspaces.length - 1;
              else return;
              event.preventDefault();
              setActive(next);
              buttons.current[next]?.focus();
            }}
          >
            <span className="workspace-dot" />
            {p.name}
          </button>
        ))}
      </div>
      <div
        className={`tour-panel tour-${product.capture}`}
        id="workspace-panel"
        role="tabpanel"
        aria-labelledby={`workspace-${active}`}
        tabIndex={0}
      >
        <div className="tour-copy">
          <h3>{product.title}</h3>
          <p>{product.intro}</p>
          <Action href={`/product/${product.slug}`} secondary>
            Explore {product.name.toLowerCase()}
          </Action>
        </div>
        <ProductFigure key={product.slug} kind={product.capture!} />
      </div>
    </section>
  );
}
