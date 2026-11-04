import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowUp,
  Leaf,
  Flame,
  Wallet,
  ShieldCheck,
  UtensilsCrossed,
  RotateCcw,
  HandHelping,
} from "lucide-react";
import { BottomSheet } from "@pos/ui";
import type { AssistantQuestion } from "@pos/contracts";
import { getCustomerMenu } from "@/features/menu/api";
import { askAssistant } from "./api";
import type { ConciergeProps, ConciergeHistoryProps } from "./types";
import { copy } from "./concierge.copy";
import { ConciergeTranscript } from "./ConciergeTranscript";

export default function ConciergeSheet({
  token,
  onOpenItem,
  onCallWaiter,
  requestBusy,
  requestMessage,
  onClose,
  turns,
  setTurns,
}: ConciergeProps & ConciergeHistoryProps & { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const t = copy;
  useEffect(
    () => () => {
      controller.current?.abort();
      setTurns((current) =>
        current.map((turn) =>
          turn.status === "pending"
            ? {
                id: turn.id,
                question: turn.question,
                status: "error",
                error: copy.interrupted,
              }
            : turn,
        ),
      );
    },
    [setTurns],
  );
  const ask = useMutation({
    mutationKey: ["customer", "assistant", token],
    gcTime: 0,
    retry: false,
    mutationFn: async ({
      question,
      id,
    }: {
      question: AssistantQuestion;
      id: string;
    }) => {
      controller.current?.abort();
      controller.current = new AbortController();
      const signal = controller.current.signal;
      try {
        const response = await askAssistant(token, question, signal);
        if (!signal.aborted)
          setTurns((current) =>
            current.map((turn) =>
              turn.id === id
                ? { id, question, status: "complete", reply: response }
                : turn,
            ),
          );
        return response;
      } catch (error) {
        if (!signal.aborted)
          setTurns((current) =>
            current.map((turn) =>
              turn.id === id
                ? {
                    id,
                    question,
                    status: "error",
                    error:
                      error instanceof Error
                        ? error.message
                        : "Unable to check the menu. Please try again or ask staff.",
                  }
                : turn,
            ),
          );
        throw error;
      }
    },
  });
  const select = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async (id: string) => {
      controller.current?.abort();
      controller.current = new AbortController();
      const menu = await getCustomerMenu(token, controller.current.signal);
      const item = menu.items.find((candidate) => candidate.id === id);
      if (!item)
        throw new Error(
          "This dish is no longer available. Please search again.",
        );
      return item;
    },
    onSuccess: (item) => {
      onClose();
      onOpenItem(item);
    },
  });
  const busy = ask.isPending || select.isPending;
  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    setMessage("");
    select.reset();
    const id = crypto.randomUUID();
    // Carry the last answer's filters so follow-ups ("and above ₹300?") refine it.
    const previous = [...turns]
      .reverse()
      .find((turn) => turn.status === "complete");
    const state = previous?.status === "complete" ? previous.reply.state : undefined;
    const question: AssistantQuestion = {
      message: text.trim(),
      ...(state ? { state } : {}),
    };
    setTurns((current) => [...current, { id, question, status: "pending" }]);
    ask.mutate({ question, id });
  };
  const composer = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(message);
      }}
      className="w-full space-y-2.5"
    >
      <label htmlFor="concierge-question" className="sr-only">
        Menu question
      </label>
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
        <textarea
          id="concierge-question"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t.placeholder}
          maxLength={600}
          rows={2}
          disabled={busy}
          aria-describedby="concierge-question-hint"
          className="min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-base leading-relaxed text-text-primary outline-none placeholder:text-text-secondary disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label={t.send}
          title={t.send}
          disabled={busy || !message.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p
        id="concierge-question-hint"
        className="px-1 text-xs leading-relaxed text-text-secondary"
      >
        {t.questionHint}
      </p>
    </form>
  );
  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Servora Concierge"
      description={t.intro}
      maxHeight="92dvh"
      contentClassName="customer-experience mx-auto h-[min(92dvh,52rem)] max-w-3xl sm:mb-4 sm:rounded-3xl"
      bodyClassName={`min-h-0 px-4 pb-3 sm:px-6 ${turns.length ? "flex flex-col overflow-y-hidden" : "overflow-y-auto"}`}
      footer={composer}
      footerClassName="block bg-surface px-4 py-3 sm:px-6"
    >
      <div
        className={
          turns.length ? "flex min-h-0 flex-1 flex-col gap-3" : "space-y-4"
        }
        lang="en"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden="true" />
            {t.menuLabel}
          </span>
        </div>
        {!turns.length ? (
          <div className="px-1 pb-2 pt-7 text-center sm:pt-10">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary-surface text-primary">
              <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
            </div>
            <h2 className="customer-display text-2xl font-semibold leading-tight sm:text-3xl">
              {t.intro}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
              {t.welcome}
            </p>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-between gap-3">
            <p className="text-xs text-text-secondary">{t.suggestions}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setTurns([]);
                ask.reset();
                select.reset();
              }}
              className="flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-text-secondary hover:bg-surface-secondary disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t.clear}
            </button>
          </div>
        )}
        <div
          className={
            turns.length
              ? "flex shrink-0 gap-2 overflow-x-auto pb-1"
              : "grid grid-cols-2 gap-2 pb-3"
          }
        >
          {t.chips.map((chip, index) => {
            const Icon =
              [Leaf, Flame, Wallet, ShieldCheck][index] ?? UtensilsCrossed;
            return (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => submit(chip)}
                className={
                  turns.length
                    ? "flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs text-text-secondary hover:border-primary/40 hover:text-primary disabled:opacity-50"
                    : "flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 text-left text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary-surface disabled:opacity-50"
                }
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                {chip}
              </button>
            );
          })}
        </div>
        {turns.length ? (
          <ConciergeTranscript
            turns={turns}
            busy={busy}
            onSelect={(id) => select.mutate(id)}
            onSuggest={submit}
          />
        ) : null}
        {select.isError ? (
          <p role="alert" className="text-sm text-error">
            {select.error.message}
          </p>
        ) : null}
        {onCallWaiter ? (
          <button
            type="button"
            disabled={requestBusy}
            onClick={onCallWaiter}
            className="mx-auto flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-text-secondary hover:bg-surface-secondary disabled:opacity-50"
          >
            <HandHelping className="h-4 w-4" aria-hidden="true" />
            {t.waiter}
          </button>
        ) : null}
        {requestMessage ? (
          <p role="status" className="text-sm text-text-secondary">
            {requestMessage}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}
