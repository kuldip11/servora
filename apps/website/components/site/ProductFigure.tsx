"use client";
import Image from "next/image";
import { useRef } from "react";
import { Expand, X } from "lucide-react";
import type { Capture } from "@/content/product";
const dimensions: Record<Capture, [number, number]> = {
  pos: [1160, 720],
  kitchen: [1160, 600],
  waiter: [440, 600],
  customer: [440, 600],
  billing: [580, 600],
};
export function ProductFigure({
  kind,
  priority = false,
}: {
  kind: Capture;
  priority?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [width, height] = dimensions[kind];
  const alt = `Servora ${kind} application components with illustrative sample data`;
  return (
    <figure className={`product-figure figure-${kind}`} data-ui>
      <button
        type="button"
        className="figure-open"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Enlarge ${kind} product view`}
      >
        <Image
          src={`/product/${kind}.webp`}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes="(max-width:760px) 94vw, 900px"
        />
        <span className="figure-zoom">
          <Expand size={16} aria-hidden="true" /> View full size
        </span>
      </button>
      <figcaption>
        Actual application components. Illustrative sample data.
      </figcaption>
      <dialog ref={dialog} className="product-dialog">
        <button
          type="button"
          className="dialog-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close product view"
        >
          <X aria-hidden="true" />
          Close
        </button>
        <Image
          src={`/product/${kind}.webp`}
          alt={alt}
          width={width}
          height={height}
          sizes="95vw"
        />
        <p>
          Actual Servora components with local sample fixtures. This is a
          product view, not a live restaurant.
        </p>
      </dialog>
    </figure>
  );
}
