import { beforeEach, describe, expect, it, vi } from "vitest";
const { list, create, update, updateStatus, remove, regenerateQr } = vi.hoisted(
  () => ({
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
    regenerateQr: vi.fn(),
  }),
);
vi.mock("../table.service", () => ({
  tableService: { list, create, update, updateStatus, remove, regenerateQr },
}));
import { tableController } from "@/modules/tables/table.controller";
const tableRecord = (overrides: Record<string, unknown> = {}) => ({
  id: "00000000-0000-4000-8000-000000000021",
  tenantId: "00000000-0000-4000-8000-000000000022",
  branchId: "00000000-0000-4000-8000-000000000023",
  name: "A",
  publicQrToken: "00000000-0000-4000-8000-000000000024",
  capacity: 4,
  status: "AVAILABLE",
  section: null,
  isActive: true,
  createdAt: new Date("2026-09-18T00:00:00.000Z"),
  updatedAt: new Date("2026-09-18T00:00:00.000Z"),
  ...overrides,
});
const auth: any = { tenantId: "t1", branchId: "b1" };
beforeEach(() => {
  vi.clearAllMocks();
});
describe("table controller", () => {
  it("delegates list/create/update and returns response envelopes", async () => {
    list.mockResolvedValue([tableRecord()]);
    create.mockResolvedValue(tableRecord());
    update.mockResolvedValue(tableRecord({ name: "A" }));
    expect(await tableController.list(auth)).toMatchObject({
      success: true,
      data: [{ id: "00000000-0000-4000-8000-000000000021" }],
    });
    expect(await tableController.create(auth, { name: "A" })).toMatchObject({
      success: true,
      data: { id: "00000000-0000-4000-8000-000000000021" },
    });
    expect(
      await tableController.update(auth, "t1", { name: "A" }),
    ).toMatchObject({
      success: true,
      data: { id: "00000000-0000-4000-8000-000000000021", name: "A" },
    });
    expect(list).toHaveBeenCalledWith(auth);
    expect(create).toHaveBeenCalledWith(auth, { name: "A" });
    expect(update).toHaveBeenCalledWith(auth, "t1", { name: "A" });
  });
  it("regenerates a table QR token", async () => {
    regenerateQr.mockResolvedValue(
      tableRecord({ publicQrToken: "00000000-0000-4000-8000-000000000025" }),
    );
    expect(await tableController.regenerateQr(auth, "t1")).toMatchObject({
      success: true,
      data: { publicQrToken: "00000000-0000-4000-8000-000000000025" },
    });
    expect(regenerateQr).toHaveBeenCalledWith(auth, "t1");
  });

  it("delegates status changes and removal", async () => {
    updateStatus.mockResolvedValue(tableRecord({ status: "OCCUPIED" }));
    remove.mockResolvedValue(undefined);
    expect(
      await tableController.updateStatus(auth, "t1", "OCCUPIED" as any),
    ).toMatchObject({ success: true, data: { status: "OCCUPIED" } });
    expect(await tableController.remove(auth, "t1")).toEqual({
      success: true,
      data: null,
    });
  });
});
