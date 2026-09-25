import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chooseSelectOption } from "@/test/select";

const h = vi.hoisted(() => ({
  overrides: {
    data: [
      {
        id: "co1",
        channel: "STAFF",
        fulfillmentType: null,
        status: null,
        isHidden: true,
      },
    ],
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  save: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/features/menu/hooks/useChannelOverrides", () => ({
  useChannelOverrides: () => h.overrides,
  useSaveChannelOverride: () => ({ mutate: h.save, isPending: false }),
  useDeleteChannelOverride: () => ({ mutate: h.remove, isPending: false }),
}));
vi.mock("@pos/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@pos/ui")>()),
  Button: ({ children, loading: _loading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({ label, ...props }: any) => (
    <label>
      {label}
      <input aria-label={props["aria-label"] ?? label} {...props} />
    </label>
  ),
}));

import { ChannelOverridesPanel } from "../ChannelOverridesPanel";

describe("ChannelOverridesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.overrides.isError = false;
  });

  it("saves and removes channel overrides", () => {
    render(<ChannelOverridesPanel itemId="i1" />);
    expect(screen.getByText(/All fulfillment/)).toBeTruthy();
    chooseSelectOption("Ordering channel", "Staff");
    chooseSelectOption("Fulfillment type", "DINE_IN");
    chooseSelectOption("Channel status", "Active");
    fireEvent.change(screen.getByLabelText("Channel override reason"), {
      target: { value: "open" },
    });
    fireEvent.click(screen.getByLabelText(/Hide from this channel/));
    fireEvent.click(screen.getByRole("button", { name: "Save override" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(h.save).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "STAFF",
        fulfillmentType: "DINE_IN",
        status: "ACTIVE",
        isHidden: true,
        availabilityReason: "open",
      }),
    );
    expect(h.remove).toHaveBeenCalledWith("co1");
  });
});
