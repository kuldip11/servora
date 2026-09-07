import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = vi.hoisted(() => ({
  findTableByQrToken: vi.fn(),
  findBranchByTakeawayQrToken: vi.fn(),
  createSession: vi.fn(),
  findSession: vi.fn(),
}));

vi.mock("@/modules/customer/customer.repository", () => ({
  customerRepository: repository,
}));

import { customerSessionService } from "@/modules/customer/customer-session.service";

const branch = {
  id: "b1",
  tenantId: "t1",
  name: "Main Branch",
  isActive: true,
  dineInEnabled: true,
  tablesEnabled: true,
  takeawayEnabled: true,
};

const table = {
  id: "table1",
  tenantId: "t1",
  branchId: "b1",
  name: "T1",
  section: "Patio",
  branch,
};

describe("customerSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.findTableByQrToken.mockResolvedValue(null);
    repository.findBranchByTakeawayQrToken.mockResolvedValue(null);
    repository.createSession.mockImplementation(async (input) => ({
      token: "session-token",
      expiresAt: input.expiresAt,
    }));
  });

  it("creates an active dine-in table session", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_000);
    repository.findTableByQrToken.mockResolvedValue(table);

    const result = await customerSessionService.createSession("qr-table");

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        branchId: "b1",
        tableId: "table1",
        mode: "DINE_IN",
        expiresAt: expect.any(Date),
      }),
    );
    expect(result).toEqual({
      sessionToken: "session-token",
      expiresAt: expect.any(Date),
      mode: "DINE_IN",
      restaurant: { id: "b1", name: "Main Branch" },
      table: { id: "table1", name: "T1", section: "Patio" },
    });
  });

  it.each([
    { isActive: false },
    { dineInEnabled: false },
    { tablesEnabled: false },
  ])("rejects unavailable dine-in branches %#", async (override) => {
    repository.findTableByQrToken.mockResolvedValue({
      ...table,
      branch: { ...branch, ...override },
    });
    await expect(
      customerSessionService.createSession("qr-table"),
    ).rejects.toThrow(
      "This restaurant is not accepting dine-in orders right now",
    );
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("falls back to an active takeaway branch and creates a takeaway session", async () => {
    repository.findBranchByTakeawayQrToken.mockResolvedValue(branch);
    const result = await customerSessionService.createSession("qr-takeaway");

    expect(repository.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        branchId: "b1",
        tableId: null,
        mode: "TAKEAWAY",
      }),
    );
    expect(result).toMatchObject({
      sessionToken: "session-token",
      mode: "TAKEAWAY",
      restaurant: { id: "b1", name: "Main Branch" },
      table: null,
    });
  });

  it("rejects unknown or disabled takeaway QR codes", async () => {
    await expect(
      customerSessionService.createSession("missing"),
    ).rejects.toThrow("Customer table not found");

    repository.findBranchByTakeawayQrToken.mockResolvedValue({
      ...branch,
      takeawayEnabled: false,
    });
    await expect(
      customerSessionService.createSession("disabled"),
    ).rejects.toThrow("Customer table not found");
  });

  it("returns an active dine-in session", async () => {
    const session = {
      id: "s1",
      tenantId: "t1",
      branchId: "b1",
      tableId: "table1",
      mode: "DINE_IN",
      expiresAt: new Date(Date.now() + 60_000),
      branch,
    };
    repository.findSession.mockResolvedValue(session);
    await expect(customerSessionService.getSession("token")).resolves.toBe(
      session,
    );
  });

  it("rejects missing and expired sessions", async () => {
    repository.findSession.mockResolvedValue(null);
    await expect(customerSessionService.getSession("missing")).rejects.toThrow(
      "Customer session is invalid or expired",
    );

    repository.findSession.mockResolvedValue({
      mode: "DINE_IN",
      expiresAt: new Date(Date.now() - 1),
      branch,
    });
    await expect(customerSessionService.getSession("expired")).rejects.toThrow(
      "Customer session is invalid or expired",
    );
  });

  it.each([
    { mode: "DINE_IN", branch: { ...branch, isActive: false } },
    { mode: "DINE_IN", branch: { ...branch, dineInEnabled: false } },
    { mode: "DINE_IN", branch: { ...branch, tablesEnabled: false } },
    { mode: "TAKEAWAY", branch: { ...branch, takeawayEnabled: false } },
  ])(
    "rejects sessions whose branch capabilities no longer allow them %#",
    async (input) => {
      repository.findSession.mockResolvedValue({
        ...input,
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(customerSessionService.getSession("token")).rejects.toThrow(
        "This restaurant is not accepting dine-in orders right now",
      );
    },
  );
});
