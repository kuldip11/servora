import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: null as string | null,
  restoreSession: vi.fn(),
  logoutSession: vi.fn(),
  logout: vi.fn(),
  loginOnLogin: undefined as (() => void) | undefined,
  boardOnLogout: undefined as (() => void) | undefined,
}));

vi.mock("../../../auth", () => ({
  getToken: () => mocks.token,
  logout: mocks.logout,
  logoutSession: mocks.logoutSession,
  restoreSession: mocks.restoreSession,
  KitchenLogin: ({ onLogin }: { onLogin: () => void }) => {
    mocks.loginOnLogin = onLogin;
    return <div>login-screen</div>;
  },
}));
vi.mock("../../pages/KitchenBoard", () => ({
  KitchenBoard: ({ onLogout }: { onLogout: () => void }) => {
    mocks.boardOnLogout = onLogout;
    return <div>board-screen</div>;
  },
}));

import { KitchenApp } from "../KitchenApp";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("KitchenApp session flow", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token = null;
    mocks.loginOnLogin = undefined;
    mocks.boardOnLogout = undefined;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it("restores a refresh-cookie session and opens the board", async () => {
    mocks.restoreSession.mockResolvedValue(true);
    await act(async () => root.render(<KitchenApp />));
    expect(mocks.restoreSession).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("board-screen");
  });

  it("falls back to login when session restoration fails", async () => {
    mocks.restoreSession.mockRejectedValue(new Error("expired"));
    await act(async () => root.render(<KitchenApp />));
    expect(mocks.logout).toHaveBeenCalled();
    expect(container.textContent).toContain("login-screen");
  });

  it("supports login and logout transitions from an authenticated session", async () => {
    mocks.token = "token";
    mocks.logoutSession.mockResolvedValue(undefined);
    await act(async () => root.render(<KitchenApp />));
    expect(container.textContent).toContain("board-screen");

    await act(async () => mocks.boardOnLogout?.());
    expect(mocks.logoutSession).toHaveBeenCalledOnce();
    expect(mocks.logout).toHaveBeenCalled();
    expect(container.textContent).toContain("login-screen");

    await act(async () => mocks.loginOnLogin?.());
    expect(container.textContent).toContain("board-screen");
  });
});
