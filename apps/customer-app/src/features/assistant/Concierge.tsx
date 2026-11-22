import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ChevronRight } from "lucide-react";
import { getAssistantCapabilities } from "./api";
import type { ConciergeProps, ConciergeTurn } from "./types";
const ConciergeSheet = lazy(() => import("./ConciergeSheet"));

export function Concierge(props: ConciergeProps) {
  return <SessionConcierge key={props.token} {...props} />;
}

function SessionConcierge(props: ConciergeProps) {
  const [turns, setTurns] = useState<ConciergeTurn[]>([]);
  const capabilities = useQuery({
    queryKey: ["customer", "assistant", "capabilities", props.token],
    queryFn: ({ signal }) => getAssistantCapabilities(props.token, signal),
    staleTime: 30000,
    gcTime: 0,
    retry: false,
  });
  const [open, setOpen] = useState(false);
  if (!capabilities.data?.enabled) return null;
  return (
    <>
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-3 rounded-2xl border border-primary-border bg-primary-surface px-4 py-4 text-left text-primary transition-colors hover:border-primary"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface">
            <MessageCircle aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Ask Servora Concierge</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-text-secondary">
              Find a dish by taste, diet or budget
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </div>
      {open ? (
        <Suspense
          fallback={
            <p role="status" className="px-4 py-3 text-sm">
              Opening Concierge…
            </p>
          }
        >
          <ConciergeSheet
            {...props}
            turns={turns}
            setTurns={setTurns}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      ) : null}
    </>
  );
}
