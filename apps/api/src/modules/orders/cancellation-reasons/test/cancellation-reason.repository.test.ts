import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  conflict: vi.fn(),
  returning: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}));
vi.mock("@/db", () => {
  m.insert.mockImplementation(() => ({ values: m.values }));
  m.values.mockImplementation(() => ({
    onConflictDoNothing: m.conflict,
    returning: m.returning,
  }));
  m.update.mockImplementation(() => ({ set: m.set }));
  m.set.mockImplementation(() => ({ where: m.where }));
  m.where.mockImplementation(() => ({ returning: m.returning }));
  return {
    db: {
      query: {
        cancellationReasons: { findMany: m.findMany, findFirst: m.findFirst },
      },
      insert: m.insert,
      update: m.update,
    },
  };
});
import { cancellationReasonRepository } from "../cancellation-reason.repository";
beforeEach(() => {
  vi.clearAllMocks();
  m.conflict.mockResolvedValue(undefined);
});
describe("cancellation reason repository", () => {
  it("ensures defaults and lists active/all reasons", async () => {
    await cancellationReasonRepository.ensureDefaults("t1");
    expect(m.values).toHaveBeenCalledWith(expect.any(Array));
    m.findMany.mockResolvedValue([]);
    await cancellationReasonRepository.list("t1");
    await cancellationReasonRepository.list("t1", true);
    expect(m.findMany).toHaveBeenCalledTimes(2);
  });
  it("finds ids including empty active-id fast path", async () => {
    m.findFirst.mockResolvedValue({ id: "r1" });
    await expect(
      cancellationReasonRepository.findById("t1", "r1"),
    ).resolves.toEqual({ id: "r1" });
    await expect(
      cancellationReasonRepository.findActiveByIds("t1", []),
    ).resolves.toEqual([]);
    m.findMany.mockResolvedValue([{ id: "r1" }]);
    await expect(
      cancellationReasonRepository.findActiveByIds("t1", ["r1"]),
    ).resolves.toEqual([{ id: "r1" }]);
  });
  it("creates and updates rows including undefined results", async () => {
    m.returning.mockResolvedValueOnce([{ id: "r1" }]);
    await expect(
      cancellationReasonRepository.create("t1", "Reason"),
    ).resolves.toEqual({ id: "r1" });
    m.returning.mockResolvedValueOnce([{ id: "r1", isActive: false }]);
    await expect(
      cancellationReasonRepository.update("t1", "r1", { isActive: false }),
    ).resolves.toMatchObject({ isActive: false });
    m.returning.mockResolvedValueOnce([]);
    await expect(
      cancellationReasonRepository.update("t1", "missing", {}),
    ).resolves.toBeUndefined();
  });
});
