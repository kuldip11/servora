import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  menus: [] as any[],
  resolved: [] as any[],
  branches: [] as any[],
  create: vi.fn(),
  publish: vi.fn(),
  del: vi.fn(),
}));
vi.mock("lucide-react", () => ({
  Pencil: () => null,
  Plus: () => null,
  Trash2: () => null,
}));
vi.mock("@/shared/lib/api-client", () => ({ apiClient: {} }));
vi.mock("@/features/branches/hooks/useBranches", () => ({
  useBranches: () => ({ data: mocks.branches }),
}));
vi.mock("@/features/menu/hooks/useMenus", () => ({
  useMenus: () => ({ data: mocks.menus, isLoading: false }),
  useCreateMenu: () => ({ mutate: mocks.create, isPending: false }),
  useSetMenuPublished: () => ({ mutate: mocks.publish, isPending: false }),
  useDeleteMenu: () => ({ mutate: mocks.del, isPending: false }),
}));
vi.mock("@pos/api-client", () => ({
  createMenuApi: () => ({ listActiveMenus: vi.fn() }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.resolved }),
}));
vi.mock("../MenuAvailabilityDialog", () => ({
  MenuAvailabilityDialog: ({ menu, onClose }: any) =>
    menu ? (
      <div>
        <span>availability:{menu.name}</span>
        <button onClick={onClose}>close-availability</button>
      </div>
    ) : null,
}));
vi.mock("@pos/ui", () => ({
  Button: ({ children, loading: _l, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
  Input: ({ label, ...p }: any) => (
    <label>
      {label}
      <input aria-label={label} {...p} />
    </label>
  ),
}));
import { MenusSection } from "../MenusSection";
const defaultMenu = {
  id: "m0",
  name: "Default Menu",
  isDefault: true,
  status: "PUBLISHED",
} as any;
const menu = {
  id: "m1",
  name: "Weekend",
  isDefault: false,
  status: "DRAFT",
} as any;
describe("MenusSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.menus = [
      defaultMenu,
      menu,
      { ...menu, id: "m2", name: "Live", status: "PUBLISHED" },
    ];
    mocks.resolved = [{ id: "org", name: "Org Menu", organizationId: "o1" }];
    mocks.branches = [{ id: "b1", name: "Central" }];
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
  });
  it("owns menu CRUD and publish/draft actions", () => {
    render(<MenusSection />);
    expect(screen.getByText(/Organization-inherited menu active/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("New menu"), {
      target: { value: "  Dinner  " },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /Create/ }).closest("form")!,
    );
    expect(mocks.create).toHaveBeenCalledWith(
      { name: "Dinner" },
      expect.any(Object),
    );
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(mocks.publish).toHaveBeenCalledWith({ id: "m1", published: true });
    fireEvent.click(screen.getByRole("button", { name: "Move to draft" }));
    expect(mocks.publish).toHaveBeenCalledWith({ id: "m2", published: false });
    fireEvent.click(screen.getByLabelText("Delete Weekend"));
    expect(mocks.del).toHaveBeenCalledWith("m1");
  });
  it("owns availability-dialog orchestration only", () => {
    render(<MenusSection />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /Availability/ })[0]!,
    );
    expect(screen.getByText("availability:Weekend")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "close-availability" }));
    expect(screen.queryByText("availability:Weekend")).toBeNull();
  });
  it("hides inherited banner when none resolve", () => {
    mocks.resolved = [];
    render(<MenusSection />);
    expect(screen.queryByText(/Organization-inherited menu active/)).toBeNull();
  });
});
