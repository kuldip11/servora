import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureDefaults: vi.fn(),
  list: vi.fn(),
  findById: vi.fn(),
  findActiveByIds: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));
vi.mock("../cancellation-reason.repository", () => ({
  cancellationReasonRepository: mocks,
}));
import { cancellationReasonService } from "@/modules/orders/cancellation-reasons/cancellation-reason.service";

const auth = (permissions = ["orders:read", "settings:update"]) =>
  ({
    userId: "u1",
    tenantId: "t1",
    branchId: null,
    email: "u@example.com",
    roles: [],
    permissions,
    tenantWide: true,
  }) as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("cancellation reason service", () => {
  it("seeds and lists tenant reasons", async () => {
    mocks.list.mockResolvedValue([{ id: "r1", label: "Kitchen error" }]);
    await expect(
      cancellationReasonService.list(auth(), true),
    ).resolves.toHaveLength(1);
    expect(mocks.ensureDefaults).toHaveBeenCalledWith("t1");
    expect(mocks.list).toHaveBeenCalledWith("t1", true);
  });

  it("creates and updates tenant-scoped reasons", async () => {
    mocks.create.mockResolvedValue({ id: "r1", label: "Custom" });
    await cancellationReasonService.create(auth(), " Custom ");
    expect(mocks.create).toHaveBeenCalledWith("t1", "Custom");
    mocks.findById.mockResolvedValue({ id: "r1" });
    await cancellationReasonService.update(auth(), "r1", { isActive: false });
    expect(mocks.update).toHaveBeenCalledWith("t1", "r1", { isActive: false });
  });

  it("requires admin permission for writes and rejects cross-tenant ids", async () => {
    await expect(
      cancellationReasonService.create(auth(["orders:read"]), "Custom"),
    ).rejects.toThrow("Insufficient permissions");
    mocks.findById.mockResolvedValue(undefined);
    await expect(
      cancellationReasonService.update(auth(), "foreign", { isActive: false }),
    ).rejects.toThrow("Cancellation reason");
  });

  it("validates active structured reason ids", async () => {
    mocks.findActiveByIds.mockResolvedValue([]);
    await expect(
      cancellationReasonService.assertUsable("t1", "inactive"),
    ).rejects.toThrow("invalid or inactive");
    await expect(
      cancellationReasonService.assertUsable("t1", undefined),
    ).resolves.toBeUndefined();
  });
});

it("covers validation and optional update patch branches", async () => {
  await expect(cancellationReasonService.create(auth(), "   ")).rejects.toThrow("label is required");
  mocks.findById.mockResolvedValue({ id: "r1" });
  await expect(cancellationReasonService.update(auth(), "r1", { label: "   " })).rejects.toThrow("label is required");
  mocks.findById.mockResolvedValue({ id: "r1" }); mocks.update.mockResolvedValue({ id: "r1" });
  await cancellationReasonService.update(auth(), "r1", { label: " New ", isActive: true });
  expect(mocks.update).toHaveBeenLastCalledWith("t1", "r1", { label: "New", isActive: true });
  mocks.findById.mockResolvedValue({ id: "r1" });
  await cancellationReasonService.update(auth(), "r1", {});
  expect(mocks.update).toHaveBeenLastCalledWith("t1", "r1", {});
  mocks.findActiveByIds.mockResolvedValue([{ id: "r1" }]);
  await expect(cancellationReasonService.assertUsable("t1", "r1")).resolves.toBeUndefined();
});
