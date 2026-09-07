import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buttonProps: [] as Array<Record<string, unknown>>,
}));

vi.mock("@pos/ui", () => ({
  Button: (props: Record<string, unknown> & { children?: unknown }) => {
    mocks.buttonProps.push(props);
    return <button type="button">{props.children as never}</button>;
  },
}));

import { MembershipSelector } from "../MembershipSelector";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("MembershipSelector", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mocks.buttonProps.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders memberships", () => {
    const membership = {
      membershipId: "m1",
      tenant: { name: "Demo" },
      roles: [{ name: "Manager" }],
    } as never;
    expect(
      renderToStaticMarkup(
        <MembershipSelector memberships={[membership]} onSelect={() => {}} />,
      ),
    ).toContain("Demo");
  });

  it("selects a membership", async () => {
    const onSelect = vi.fn();
    await act(async () => {
      root.render(
        <MembershipSelector
          memberships={[
            {
              membershipId: "m1",
              tenant: { name: "Demo" },
              roles: [{ name: "Chef" }, { name: "Manager" }],
            } as never,
          ]}
          onSelect={onSelect}
        />,
      );
    });
    await act(async () =>
      container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(onSelect).toHaveBeenCalledWith("m1");
    expect(container.textContent).toContain("Chef, Manager");
  });
});
