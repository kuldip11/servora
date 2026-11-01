// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  path: "/",
  ready: undefined as undefined | (() => void),
}));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("next/script", () => ({
  default: (props: { id?: string; onReady?: () => void }) => {
    if (props.id === "servora-gtag") state.ready = props.onReady;
    return null;
  },
}));

it("waits for initialization, tracks navigation once and respects consent changes", async () => {
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const gtag = vi.fn();
  Object.assign(window, { gtag });
  localStorage.setItem("servora_cookie_consent", "accepted");
  const { Analytics } = await import("@/components/analytics/Analytics");
  const element = document.createElement("div");
  document.body.append(element);
  const root = createRoot(element);
  try {
    await act(async () => root.render(<Analytics />));
    expect(gtag).not.toHaveBeenCalled();
    await act(async () => state.ready?.());
    expect(gtag).toHaveBeenCalledTimes(1);
    state.path = "/pricing";
    await act(async () => root.render(<Analytics />));
    expect(gtag).toHaveBeenLastCalledWith(
      "event",
      "page_view",
      expect.objectContaining({
        page_path: "/pricing",
        page_location: `${window.location.origin}/pricing`,
      }),
    );
    await act(async () => root.render(<Analytics />));
    expect(gtag).toHaveBeenCalledTimes(2);
    localStorage.setItem("servora_cookie_consent", "essential");
    await act(async () => {
      window.dispatchEvent(new Event("servora:consent-changed"));
    });
    expect(
      (window as unknown as Record<string, unknown>)["ga-disable-G-TEST"],
    ).toBe(true);
    state.path = "/contact";
    await act(async () => root.render(<Analytics />));
    expect(gtag).toHaveBeenCalledTimes(2);
    localStorage.setItem("servora_cookie_consent", "accepted");
    await act(async () => {
      window.dispatchEvent(new Event("servora:consent-changed"));
    });
    expect(gtag).toHaveBeenCalledTimes(3);
  } finally {
    await act(async () => root.unmount());
    element.remove();
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});
