import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  clickableRowKeyDown,
  sortRows,
  nextSortState,
  computeStickyOffsets,
  matchesGlobalFilter,
  useVirtualizedRows,
} from "../shared";

type Row = { id: string; name: string; score: number };
const columns = [
  {
    id: "name",
    header: "Name",
    cell: (row: Row) => row.name,
    sortValue: (row: Row) => row.name,
    sortable: true,
  },
  {
    id: "score",
    header: "Score",
    cell: (row: Row) => row.score,
    sortValue: (row: Row) => row.score,
    sortable: true,
  },
];

describe("data shared helpers", () => {
  it("sorts rows and cycles sort state", () => {
    expect(
      sortRows(
        [
          { id: "1", name: "B", score: 2 },
          { id: "2", name: "A", score: 1 },
        ],
        columns,
        { columnId: "name", direction: "asc" },
      ).map((r) => r.name),
    ).toEqual(["A", "B"]);
    expect(nextSortState(null, "name")).toEqual({
      columnId: "name",
      direction: "asc",
    });
    expect(
      nextSortState({ columnId: "name", direction: "asc" }, "name"),
    ).toEqual({ columnId: "name", direction: "desc" });
    expect(
      nextSortState({ columnId: "name", direction: "desc" }, "name"),
    ).toBeNull();
  });
  it("handles clickable keyboard rows and global filtering", () => {
    const onRowClick = vi.fn();
    const handler = clickableRowKeyDown({ id: "1" }, onRowClick);
    expect(handler).toBeDefined();
    const rowElement = {};
    handler!({
      key: "Enter",
      preventDefault: vi.fn(),
      target: rowElement,
      currentTarget: rowElement,
    } as never);
    expect(onRowClick).toHaveBeenCalledWith({ id: "1" });
    expect(matchesGlobalFilter("Alice Johnson", "john")).toBe(true);
    expect(matchesGlobalFilter("Alice Johnson", "xyz")).toBe(false);
  });
  it("computes sticky offsets and virtualization dimensions", () => {
    const offsets = computeStickyOffsets([
      {
        id: "a",
        header: "A",
        cell: (r: Row) => r.name,
        sticky: "left",
        width: "100px",
      },
      { id: "b", header: "B", cell: (r: Row) => r.score },
      {
        id: "c",
        header: "C",
        cell: (r: Row) => r.score,
        sticky: "right",
        width: "80px",
      },
    ]);
    expect(offsets.get("a")?.left).toBe(0);
    expect(offsets.get("c")?.right).toBe(0);
    const ref = {
      current: null,
    } as import("react").RefObject<HTMLElement | null>;
    const { result } = renderHook(() => useVirtualizedRows(100, ref, 44, 8));
    expect(result.current.totalHeight).toBe(4400);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.offsetY).toBe(0);
  });
});
