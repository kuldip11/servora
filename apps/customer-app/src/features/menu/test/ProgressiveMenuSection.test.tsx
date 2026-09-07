import React, { act } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../MenuCard", () => ({
  MenuCard: ({ item }: any) => <div>card:{item.name}</div>,
}));
import { ProgressiveMenuSection } from "../components/ProgressiveMenuSection";
const item = (id: string) => ({ id, name: `Dish ${id}` }) as any;
let callbacks: IntersectionObserverCallback[] = [];
class IO {
  constructor(public cb: IntersectionObserverCallback) {
    callbacks.push(cb);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds = [];
}
beforeEach(() => {
  callbacks = [];
  (globalThis as any).IntersectionObserver = IO;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});
describe("ProgressiveMenuSection", () => {
  it("owns progressive batching and active-section observation", () => {
    const onActive = vi.fn();
    render(
      <ProgressiveMenuSection
        sectionId="c1"
        title="Mains"
        items={Array.from({ length: 13 }, (_, i) => item(String(i)))}
        onOpenItem={vi.fn()}
        onActive={onActive}
      />,
    );
    expect(screen.getByText(/Loading more mains/)).toBeTruthy();
    act(() => {
      callbacks.forEach((cb) =>
        cb([{ isIntersecting: true } as any], {} as any),
      );
    });
    expect(onActive).toHaveBeenCalled();
    expect(screen.queryByText(/Loading more mains/)).toBeNull();
  });
  it("does not render an empty section", () => {
    const { container } = render(
      <ProgressiveMenuSection
        sectionId="c1"
        title="Mains"
        items={[]}
        onOpenItem={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
