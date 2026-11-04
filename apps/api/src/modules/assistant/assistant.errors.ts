export type AssistantProtocolReason =
  | "missing_tool"
  | "duplicate_tools"
  | "invalid_tool_result"
  | "truncated_output";

// Controlled codes only; never attach model arguments or provider payloads.
export class AssistantProtocolError extends Error {
  constructor(readonly reason: AssistantProtocolReason) {
    super("Menu classification protocol failed");
    this.name = "AssistantProtocolError";
  }
}
