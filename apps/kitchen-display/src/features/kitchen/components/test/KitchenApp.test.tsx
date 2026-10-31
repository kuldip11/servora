import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../../auth", () => ({
  getToken: () => null,
  logout: vi.fn(),
  logoutSession: vi.fn(),
  restoreSession: vi.fn(),
  KitchenLogin: () => <div>login</div>,
}));
vi.mock("../../pages/KitchenBoard", () => ({
  KitchenBoard: () => <div>board</div>,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ cancelQueries: vi.fn(), clear: vi.fn() }),
}));
vi.mock("../../../../shared/lib/query-scope", () => ({
  getKitchenQueryScope: () => [null, null],
}));

import { KitchenApp } from "@/features/kitchen/components/KitchenApp";

describe("KitchenApp", () =>
  it("shows session restoration before deciding whether login is required", () =>
    expect(renderToStaticMarkup(<KitchenApp />)).toContain(
      "Restoring session",
    )));
