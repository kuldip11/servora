import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buttonProps: [] as Array<Record<string, unknown>>,
  toast: vi.fn(),
}));

vi.mock("@pos/ui", () => ({
  Button: (props: Record<string, unknown> & { children?: unknown }) => {
    mocks.buttonProps.push(props);
    return <button type="button">{props.children as never}</button>;
  },
  toast: mocks.toast,
}));

import { BranchSelector } from "../BranchSelector";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("BranchSelector", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mocks.buttonProps.length = 0;
    mocks.toast.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("renders branches", () => {
    const branch = {
      id: "b1",
      name: "Main Kitchen",
      address: "Address",
    } as never;
    const html = renderToStaticMarkup(
      <BranchSelector
        branches={[branch]}
        onSelect={() => {}}
        onBack={() => {}}
      />,
    );
    expect(html).toContain("Main Kitchen");
    expect(html).toContain("Enter Kitchen");
  });

  it("validates and confirms branch selection, then supports back", async () => {
    const onSelect = vi.fn();
    const onBack = vi.fn();
    const branches = [
      { id: "b1", name: "Main", address: "One" },
      { id: "b2", name: "Bar", address: "Two" },
    ] as never;

    await act(async () => {
      root.render(
        <BranchSelector
          branches={branches}
          onSelect={onSelect}
          onBack={onBack}
        />,
      );
    });

    const firstButtons = [...mocks.buttonProps];
    (firstButtons[0]?.onClick as (() => void) | undefined)?.();
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "Please select a branch",
      tone: "danger",
    });

    const branchButton = container.querySelectorAll("button")[1];
    await act(async () =>
      branchButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );

    const latestButtons = mocks.buttonProps.slice(-2);
    (latestButtons[0]?.onClick as (() => void) | undefined)?.();
    expect(onSelect).toHaveBeenCalledWith("b2");
    (latestButtons[1]?.onClick as (() => void) | undefined)?.();
    expect(onBack).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Bar");
  });
});
