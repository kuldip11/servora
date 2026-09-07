import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  permissionFindMany: vi.fn(),
  roleFindFirst: vi.fn(),
  txDeleteWhere: vi.fn(),
  txDelete: vi.fn(),
  txInsertValues: vi.fn(),
  txInsert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/db", () => {
  mocks.txDelete.mockImplementation(() => ({ where: mocks.txDeleteWhere }));
  mocks.txInsert.mockImplementation(() => ({ values: mocks.txInsertValues }));
  mocks.transaction.mockImplementation(async (fn: Function) => fn({ delete: mocks.txDelete, insert: mocks.txInsert }));
  return {
    db: {
      query: {
        permissions: { findMany: mocks.permissionFindMany },
        roles: { findFirst: mocks.roleFindFirst },
      },
      transaction: mocks.transaction,
    },
  };
});

import { permissionRepository } from "../permission.repository";

describe("permission repository coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissionFindMany.mockImplementation(async (options?: any) => {
      options?.orderBy?.({ module: "module", key: "key" }, { asc: (v: unknown) => v });
      return [{ id: "p1" }];
    });
    mocks.roleFindFirst.mockResolvedValue({ id: "r1" });
    mocks.txDeleteWhere.mockResolvedValue(undefined);
    mocks.txInsertValues.mockResolvedValue(undefined);
  });

  it("lists permissions, finds roles, and short-circuits empty id lookups", async () => {
    await expect(permissionRepository.list()).resolves.toEqual([{ id: "p1" }]);
    await expect(permissionRepository.findRole("t1", "r1")).resolves.toEqual({ id: "r1" });
    await expect(permissionRepository.findPermissionsByIds([])).resolves.toEqual([]);
  });

  it("finds permissions by ids", async () => {
    await expect(permissionRepository.findPermissionsByIds(["p1"])).resolves.toEqual([{ id: "p1" }]);
    expect(mocks.permissionFindMany).toHaveBeenCalledTimes(1);
  });

  it("replaces role permissions with and without inserts", async () => {
    await permissionRepository.replaceRolePermissions("r1", ["p1", "p2"]);
    expect(mocks.txDeleteWhere).toHaveBeenCalled();
    expect(mocks.txInsertValues).toHaveBeenCalledWith([
      { roleId: "r1", permissionId: "p1" },
      { roleId: "r1", permissionId: "p2" },
    ]);

    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (fn: Function) => fn({ delete: mocks.txDelete, insert: mocks.txInsert }));
    mocks.txDelete.mockImplementation(() => ({ where: mocks.txDeleteWhere }));
    mocks.txInsert.mockImplementation(() => ({ values: mocks.txInsertValues }));
    await permissionRepository.replaceRolePermissions("r1", []);
    expect(mocks.txInsert).not.toHaveBeenCalled();
  });
});
