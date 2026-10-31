import type { KeyboardEvent } from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildRows,
  filterOptions,
  rowDomId,
  useActiveRow,
  useDebouncedValue,
  useTypeaheadBuffer,
} from "../shared";

const options = [
  { value: "1", label: "Apple" },
  { value: "2", label: "Banana", group: "Fruit" },
  { value: "3", label: "Disabled", disabled: true },
];

describe("selection shared", () => {
  it("builds grouped rows and filters options", async () => {
    expect(buildRows(options).some((row) => row.kind === "header")).toBe(true);
    expect(filterOptions(options, "ban")).toEqual([options[1]]);
    expect(rowDomId("list", 4)).toBe("list-row-4");
  });
  it("tracks active rows and typeahead prefixes", async () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useActiveRow(buildRows(options), commit),
    );
    act(() => result.current.setActiveRowIndex(1));
    expect(result.current.activeRowIndex).toBe(1);
    act(() =>
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent),
    );
    expect(commit).toHaveBeenCalled();
    const onPrefix = vi.fn();
    renderHook(() => useTypeaheadBuffer(onPrefix));
  });
  it("debounces a changing value", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 50),
      { initialProps: { value: "a" } },
    );
    rerender({ value: "ab" });
    expect(result.current).toBe("a");
    await act(() => vi.advanceTimersByTime(50));
    expect(result.current).toBe("ab");
    vi.useRealTimers();
  });
});
