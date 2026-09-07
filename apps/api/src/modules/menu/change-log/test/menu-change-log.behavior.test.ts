import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  insert: vi.fn(), values: vi.fn(), returning: vi.fn(),
  findMany: vi.fn(), select: vi.fn(), from: vi.fn(), where: vi.fn(), orderBy: vi.fn(),
}));

vi.mock("@/db", () => {
  m.insert.mockImplementation(() => ({ values: m.values }));
  m.values.mockImplementation(() => ({ returning: m.returning }));
  m.select.mockImplementation(() => ({ from: m.from }));
  m.from.mockImplementation(() => ({ where: m.where }));
  m.where.mockImplementation(() => ({ orderBy: m.orderBy }));
  return { db: { insert: m.insert, select: m.select, query: { menuChangeEvents: { findMany: m.findMany } } } };
});

import { buildDiff, menuChangeLog } from "../menu-change-log";

beforeEach(() => { vi.clearAllMocks(); });

describe("menu change log comprehensive coverage", () => {
  it("builds diffs for unchanged, added, removed, and changed values", () => {
    expect(buildDiff({ a: 1 }, { a: 1 })).toEqual({});
    expect(buildDiff({ a: 1, b: 2 }, { a: 3, c: 4 })).toEqual({
      a: { old: 1, new: 3 },
      b: { old: 2, new: null },
      c: { old: null, new: 4 },
    });
    expect(buildDiff({ removed: true }, null)).toEqual({ removed: { old: true, new: null } });
  });

  it("records one event and many events including the empty fast path", async () => {
    m.returning.mockResolvedValueOnce([{ id: "e1" }]);
    await expect(menuChangeLog.record({ tenantId: "t1", userId: "u1" }, "MENU_ITEM", "i1", "UPDATED", { x: 1 })).resolves.toEqual({ id: "e1" });
    expect(m.values).toHaveBeenLastCalledWith(expect.objectContaining({ tenantId: "t1", changedBy: "u1", entityId: "i1" }));

    await expect(menuChangeLog.recordMany({ tenantId: "t1", userId: "u1" }, [])).resolves.toEqual([]);
    m.returning.mockResolvedValueOnce([{ id: "e2" }, { id: "e3" }]);
    await expect(menuChangeLog.recordMany({ tenantId: "t1", userId: "u1" }, [
      { entityType: "MENU_ITEM", entityId: "i1", changeType: "CREATED", diff: { a: 1 } },
      { entityType: "TAG", entityId: "t1", changeType: "DELETED", diff: {} },
    ])).resolves.toHaveLength(2);
    expect(m.values).toHaveBeenLastCalledWith(expect.arrayContaining([
      expect.objectContaining({ tenantId: "t1", changedBy: "u1" }),
    ]));
  });

  it("lists with and without every optional filter and caps limits", async () => {
    m.findMany.mockResolvedValue([]);
    await menuChangeLog.list("t1", {});
    expect(m.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 50 }));
    const before = new Date("2026-01-01T00:00:00.000Z");
    await menuChangeLog.list("t1", { entityType: "MENU_ITEM", entityId: "i1", changeType: "UPDATED", before, limit: 500 });
    expect(m.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100 }));
  });

  it("returns latest unique event ids per item and handles empty ids", async () => {
    await expect(menuChangeLog.latestForItems("t1", [], new Date())).resolves.toEqual(new Map());
    m.orderBy.mockResolvedValueOnce([
      { id: "e3", entityId: "i1" },
      { id: "e2", entityId: "i1" },
      { id: "e1", entityId: "i2" },
    ]);
    const out = await menuChangeLog.latestForItems("t1", ["i1", "i1", "i2"], new Date("2026-01-01"));
    expect(out).toEqual(new Map([["i1", "e3"], ["i2", "e1"]]));
  });
});
