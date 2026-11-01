import { describe, expect, it, vi } from "vitest";
const toast = vi.hoisted(() => vi.fn());
const getErrorMessage = vi.hoisted(() => vi.fn());
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  toast,
}));
vi.mock("../errors", () => ({ getErrorMessage }));
import { notifyError, notifySuccess } from "@/shared/lib/notify";
describe("notify", () => {
  it("notifies errors", () => {
    getErrorMessage.mockReturnValue("Bad request");
    const err = new Error("x");
    notifyError(err, "Fallback");
    expect(getErrorMessage).toHaveBeenCalledWith(err, "Fallback");
    expect(toast).toHaveBeenCalledWith({
      title: "Bad request",
      tone: "danger",
    });
  });
  it("notifies success", () => {
    notifySuccess("Saved");
    expect(toast).toHaveBeenCalledWith({ title: "Saved", tone: "success" });
  });
});
