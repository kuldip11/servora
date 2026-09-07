import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@pos/ui", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

import { PublishBadge } from "../PublishBadge";

describe("PublishBadge", () => {
  it("renders draft only when unpublished", () => {
    const { rerender } = render(<PublishBadge isPublished={false} />);
    expect(screen.getByText("Draft")).toBeTruthy();
    rerender(<PublishBadge isPublished />);
    expect(screen.queryByText("Draft")).toBeNull();
  });
});
