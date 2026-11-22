import type { Dispatch, SetStateAction } from "react";
import type { AssistantQuestion, AssistantReply } from "@pos/contracts";
import type { CustomerMenuItem } from "@/features/menu/api";
export type ConciergeProps = {
  token: string;
  onOpenItem: (item: CustomerMenuItem) => void;
  onCallWaiter?: (() => void) | undefined;
  requestBusy: boolean;
  requestMessage: string | null;
};

export type ConciergeTurn = {
  id: string;
  question: AssistantQuestion;
} & (
  | { status: "pending" }
  | { status: "complete"; reply: AssistantReply }
  | { status: "error"; error: string }
);

export type ConciergeHistoryProps = {
  turns: ConciergeTurn[];
  setTurns: Dispatch<SetStateAction<ConciergeTurn[]>>;
};
