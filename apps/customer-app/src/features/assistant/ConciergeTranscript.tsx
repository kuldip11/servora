import {
  ArrowUpRight,
  UtensilsCrossed,
  Leaf,
  Egg,
  Drumstick,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { formatMoney } from "@/shared/utils/money";
import { copy } from "./concierge.copy";
import type { ConciergeTurn } from "./types";

export function ConciergeTranscript({
  turns,
  busy,
  onSelect,
  onSuggest,
}: {
  turns: ConciergeTurn[];
  busy: boolean;
  onSelect: (id: string) => void;
  onSuggest: (text: string) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLOListElement>(null);
  // One scroll owner. Scroll after the completed turn commits, and again when
  // cards/fonts or the available viewport change the measured dimensions.
  useLayoutEffect(() => {
    if (viewport.current)
      viewport.current.scrollTop = viewport.current.scrollHeight;
  }, [turns]);
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (viewport.current)
        viewport.current.scrollTop = viewport.current.scrollHeight;
    });
    if (viewport.current) observer.observe(viewport.current);
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={viewport}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
    >
      <ol
        ref={content}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions text"
        className="space-y-6 py-3"
      >
        {turns.map((turn, index) => {
          const t = copy;
          return (
            <li key={turn.id} lang="en" className="space-y-3">
              <div className="ml-auto max-w-[85%] break-words rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground">
                <span className="sr-only">{t.you}: </span>
                {turn.question.message}
              </div>
              <div className="space-y-3 rounded-2xl rounded-bl-md bg-surface-secondary/50 p-3 sm:p-4">
                <p className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
                  Servora Concierge
                </p>
                {turn.status === "pending" ? (
                  <p role="status" className="text-sm text-text-secondary">
                    {t.busy}
                  </p>
                ) : turn.status === "error" ? (
                  <p role="alert" className="text-sm text-error">
                    {turn.error}
                  </p>
                ) : (
                  <CompletedReply
                    turn={turn}
                    busy={busy}
                    onSelect={onSelect}
                    onSuggest={onSuggest}
                    isLatest={index === turns.length - 1}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function CompletedReply({
  turn,
  busy,
  onSelect,
  onSuggest,
  isLatest,
}: {
  turn: Extract<ConciergeTurn, { status: "complete" }>;
  busy: boolean;
  onSelect: (id: string) => void;
  onSuggest: (text: string) => void;
  isLatest: boolean;
}) {
  const result = turn.reply;
  const t = copy;
  return (
    <>
      <p className="text-sm">{result.message}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {result.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-col rounded-2xl border border-border bg-surface p-3.5 transition-colors hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 break-words text-sm font-semibold leading-snug">
                {item.name}
              </h3>
              <span className="whitespace-nowrap text-sm font-semibold text-primary">
                {formatMoney(Number(item.basePrice))}
              </span>
            </div>
            <p className="mb-3 mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
              {item.foodType === "VEG" ? (
                <Leaf className="h-3 w-3 text-primary" aria-hidden="true" />
              ) : item.foodType === "EGG" ? (
                <Egg className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Drumstick className="h-3 w-3" aria-hidden="true" />
              )}
              {item.foodType === "VEG"
                ? t.veg
                : item.foodType === "EGG"
                  ? t.egg
                  : t.nonVeg}{" "}
              · {t.basePrice}
              {item.hasOptions ? ` · ${t.hasOptions}` : ""}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => onSelect(item.id)}
              className="mt-auto flex min-h-11 w-full items-center justify-between rounded-xl bg-primary-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-50"
            >
              {t.open}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      {result.items.length ? (
        <p className="text-xs leading-relaxed text-text-secondary">
          {result.disclaimer}
        </p>
      ) : null}
      {isLatest && result.suggestions?.length ? (
        <div className="flex flex-wrap gap-2 pt-1" aria-label={t.followUps}>
          {result.suggestions.map((text) => (
            <button
              key={text}
              type="button"
              disabled={busy}
              onClick={() => onSuggest(text)}
              className="min-h-10 rounded-full border border-border bg-surface px-3 text-xs text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
