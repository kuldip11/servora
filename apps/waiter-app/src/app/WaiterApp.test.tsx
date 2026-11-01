import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("@tanstack/react-router", () => ({
  RouterProvider: () => <div>Router Ready</div>,
}));
vi.mock("./router", () => ({ router: {} }));
import { WaiterApp } from "./WaiterApp";
describe("WaiterApp", () => {
  it("renders router provider", () =>
    expect(renderToStaticMarkup(<WaiterApp />)).toContain("Router Ready"));
});
