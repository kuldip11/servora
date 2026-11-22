import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  ASSISTANT_ENABLED: "false",
  ASSISTANT_BRANCH_IDS: "",
  ASSISTANT_MODEL: "",
  AI_GATEWAY_API_KEY: "",
}));
vi.mock("@/config/env", () => ({ env: state }));
import { assistantEnabledForBranch } from "../assistant.config";
beforeEach(() => {
  Object.assign(state, {
    ASSISTANT_ENABLED: "true",
    ASSISTANT_BRANCH_IDS: "branch-A, branch-B",
    ASSISTANT_MODEL: "configured-model",
    AI_GATEWAY_API_KEY: "configured-key",
  });
});
describe("pilot feature enablement", () => {
  it("requires an exact branch allowlist match", () => {
    expect(assistantEnabledForBranch("branch-A")).toBe(true);
    expect(assistantEnabledForBranch("branch-B")).toBe(true);
    expect(assistantEnabledForBranch("branch")).toBe(false);
    expect(assistantEnabledForBranch("branch-C")).toBe(false);
  });
  it("honors the global kill switch", () => {
    state.ASSISTANT_ENABLED = "false";
    expect(assistantEnabledForBranch("branch-A")).toBe(false);
  });
  it("does not enable calls without both a model and a key", () => {
    state.ASSISTANT_MODEL = "";
    expect(assistantEnabledForBranch("branch-A")).toBe(false);
    state.ASSISTANT_MODEL = "configured";
    state.AI_GATEWAY_API_KEY = "";
    expect(assistantEnabledForBranch("branch-A")).toBe(false);
  });
});
