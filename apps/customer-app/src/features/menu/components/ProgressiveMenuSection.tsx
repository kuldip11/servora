import { useEffect, useRef, useState } from "react";
import type { CustomerMenuItem } from "@/api";
import { MenuCard } from "@/features/menu/MenuCard";

const MENU_BATCH_SIZE = 12;

interface ProgressiveMenuSectionProps {
  sectionId: string;
  title: string;
  eyebrow?: string;
  items: CustomerMenuItem[];
  onOpenItem: (item: CustomerMenuItem) => void;
  onActive?: () => void;
}

export const ProgressiveMenuSection = ({
  sectionId,
  title,
  eyebrow,
  items,
  onOpenItem,
  onActive,
}: ProgressiveMenuSectionProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(MENU_BATCH_SIZE);

  useEffect(() => setVisibleCount(MENU_BATCH_SIZE), [items]);
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || !onActive) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && onActive(),
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onActive]);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || visibleCount >= items.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting)
          setVisibleCount((current) =>
            Math.min(items.length, current + MENU_BATCH_SIZE),
          );
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [items.length, visibleCount]);

  if (!items.length) return null;
  const visibleItems = items.slice(0, visibleCount);
  return (
    <section
      ref={sectionRef}
      id={`menu-section-${sectionId}`}
      className="scroll-mt-24 py-3"
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#d45d24]">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="customer-display mt-1 text-2xl font-bold">{title}</h3>
        </div>
        <span className="text-xs text-text-secondary">
          {items.length} {items.length === 1 ? "dish" : "dishes"}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleItems.map((item) => (
          <MenuCard key={item.id} item={item} onSelect={onOpenItem} />
        ))}
      </div>
      {visibleCount < items.length ? (
        <div
          ref={sentinelRef}
          className="py-5 text-center text-xs text-text-secondary"
        >
          Loading more {title.toLowerCase()}…
        </div>
      ) : null}
    </section>
  );
};
