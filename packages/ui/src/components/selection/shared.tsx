import {
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from "react";
import { Check } from "lucide-react";
import { cn } from "../../utils/cn";

export interface SelectOption {
  value: string;
  label: string;

  description?: string | undefined;
  icon?: ComponentType<{ className?: string }> | undefined;

  media?: ReactNode | undefined;
  disabled?: boolean | undefined;

  group?: string | undefined;
}

export const ROW_HEIGHT = 40;
const OVERSCAN = 8;

type Row =
  | { kind: "header"; key: string; label: string }
  | { kind: "option"; key: string; option: SelectOption; optionIndex: number };

export const buildRows = (options: readonly SelectOption[]): Row[] => {
  const hasAnyGroup = options.some((o) => o.group);
  if (!hasAnyGroup) {
    return options.map((option, optionIndex) => ({
      kind: "option",
      key: option.value,
      option,
      optionIndex,
    }));
  }
  const rows: Row[] = [];
  const seenGroups = new Set<string | undefined>();
  options.forEach((option, optionIndex) => {
    if (!seenGroups.has(option.group)) {
      seenGroups.add(option.group);
      if (option.group) {
        rows.push({
          kind: "header",
          key: `__group_${option.group}`,
          label: option.group,
        });
      }
    }
    rows.push({ kind: "option", key: option.value, option, optionIndex });
  });
  return rows;
};

const optionRowIndices = (rows: Row[]): number[] => {
  const out: number[] = [];
  rows.forEach((r, i) => {
    if (r.kind === "option") out.push(i);
  });
  return out;
};

export const useVirtualRows = (
  count: number,
  containerRef: RefObject<HTMLElement | null>,
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight);
    const resizeObserver = new ResizeObserver(() =>
      setViewportHeight(el.clientHeight),
    );
    resizeObserver.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  const totalHeight = count * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    count,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );

  return {
    totalHeight,
    startIndex,
    endIndex,
    offsetY: startIndex * ROW_HEIGHT,
  };
};

export const filterOptions = (
  options: readonly SelectOption[],
  query: string,
): SelectOption[] => {
  if (!query.trim()) return [...options];
  const q = query.trim().toLowerCase();
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q),
  );
};

export const rowDomId = (listboxId: string, rowIndex: number) => {
  return `${listboxId}-row-${rowIndex}`;
};

export const popoverContentClasses = cn(
  "z-50 overflow-hidden rounded-md border border-border bg-surface shadow-dropdown",
);

export const triggerBaseClasses = cn(
  "flex w-full items-center justify-between gap-2 text-left text-sm text-text-primary bg-surface border rounded-md",
  "px-3 py-2.5 transition-colors duration-fast ease-standard",
  "focus:outline-none focus:ring-2 focus:border-transparent",
  "disabled:bg-surface-secondary disabled:text-text-disabled disabled:cursor-not-allowed",
);

const HeaderRow = ({ label }: { label: string }) => {
  return (
    <li
      role="presentation"
      style={{ height: ROW_HEIGHT }}
      className="flex items-end pb-1 px-3 text-xs font-semibold text-text-secondary uppercase tracking-wide"
    >
      {label}
    </li>
  );
};

const OptionRow = ({
  option,
  selected,
  active,
  domId,
  onClick,
  leading,
}: {
  option: SelectOption;
  selected: boolean;
  active: boolean;
  domId: string;
  onClick: () => void;
  leading?: ReactNode;
}) => {
  const Icon = option.icon;
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <li
      id={domId}
      role="option"
      aria-selected={selected}
      aria-disabled={option.disabled || undefined}
      onClick={() => !option.disabled && onClick()}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "flex items-center gap-2 px-3 text-sm cursor-pointer select-none",
        option.disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        !option.disabled && active && "bg-surface-secondary",
        !option.disabled && !active && "hover:bg-surface-secondary",
      )}
    >
      {leading}
      {!leading && option.media}
      {!leading && !option.media && Icon && (
        <Icon className="w-4 h-4 text-text-secondary shrink-0" />
      )}
      <span className="flex-1 min-w-0 truncate text-text-primary">
        {option.label}
      </span>
      {option.description && (
        <span className="text-xs text-text-secondary truncate shrink-0 max-w-[40%]">
          {option.description}
        </span>
      )}
      {!leading && selected && (
        <Check className="w-4 h-4 text-primary shrink-0" />
      )}
    </li>
  );
};

export const VirtualListbox = ({
  rows,
  listboxId,
  listRef,
  activeRowIndex,
  maxHeight,
  isSelected,
  onCommitRow,
  renderLeading,
  emptyMessage = "No options",
  multiselectable = false,
}: {
  rows: Row[];
  listboxId: string;
  listRef: RefObject<HTMLUListElement | null>;
  activeRowIndex: number;
  maxHeight: number;
  isSelected: (option: SelectOption) => boolean;
  onCommitRow: (rowIndex: number) => void;
  renderLeading?:
    ((option: SelectOption, selected: boolean) => ReactNode) | undefined;
  emptyMessage?: string | undefined;

  multiselectable?: boolean | undefined;
}) => {
  const { totalHeight, startIndex, endIndex, offsetY } = useVirtualRows(
    rows.length,
    listRef,
  );
  const visible = rows.slice(startIndex, endIndex);

  return (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-multiselectable={multiselectable || undefined}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.scrollTop += event.deltaY;
      }}
      onTouchMove={(event) => event.stopPropagation()}
      style={{
        maxHeight: `min(${maxHeight}px, calc(var(--radix-popover-content-available-height, ${maxHeight}px) - 8px))`,
        overflowY: "auto",
        overscrollBehavior: "contain",
        touchAction: "pan-y",
        WebkitOverflowScrolling: "touch",
      }}
      className="relative outline-none py-1"
    >
      {rows.length === 0 ? (
        <li className="px-3 py-6 text-sm text-center text-text-secondary">
          {emptyMessage}
        </li>
      ) : (
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visible.map((row, i) => {
              const rowIndex = startIndex + i;
              if (row.kind === "header")
                return <HeaderRow key={row.key} label={row.label} />;
              const selected = isSelected(row.option);
              return (
                <OptionRow
                  key={row.key}
                  option={row.option}
                  selected={selected}
                  active={rowIndex === activeRowIndex}
                  domId={rowDomId(listboxId, rowIndex)}
                  onClick={() => onCommitRow(rowIndex)}
                  leading={renderLeading?.(row.option, selected)}
                />
              );
            })}
          </div>
        </div>
      )}
    </ul>
  );
};

export const useActiveRow = (
  rows: Row[],
  onCommit: (rowIndex: number) => void,
) => {
  const selectable = optionRowIndices(rows).filter((index) => {
    const row = rows[index];
    return row?.kind === "option" && !row.option.disabled;
  });
  const selectableKey = selectable.join(",");
  const [activeRowIndex, setActiveRowIndex] = useState<number>(
    selectable[0] ?? -1,
  );

  useEffect(() => {
    const currentSelectable = selectableKey
      ? selectableKey.split(",").map(Number)
      : [];
    setActiveRowIndex((current) =>
      currentSelectable.includes(current)
        ? current
        : (currentSelectable[0] ?? -1),
    );
  }, [selectableKey]);

  function move(dir: 1 | -1) {
    if (selectable.length === 0) return;
    const pos = selectable.indexOf(activeRowIndex);
    const next =
      pos === -1 ? 0 : (pos + dir + selectable.length) % selectable.length;
    setActiveRowIndex(selectable[next]!);
  }

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        break;
      case "Home":
        e.preventDefault();
        if (selectable[0] !== undefined) setActiveRowIndex(selectable[0]);
        break;
      case "End": {
        e.preventDefault();
        const last = selectable.at(-1);
        if (last !== undefined) setActiveRowIndex(last);
        break;
      }
      case "Enter":
        e.preventDefault();
        if (activeRowIndex >= 0) onCommit(activeRowIndex);
        break;
      default:
        break;
    }
  }

  function typeahead(prefix: string) {
    const match = selectable.find((i) => {
      const r = rows[i];
      return (
        r?.kind === "option" && r.option.label.toLowerCase().startsWith(prefix)
      );
    });
    if (match !== undefined) setActiveRowIndex(match);
  }

  return { activeRowIndex, setActiveRowIndex, onKeyDown, typeahead };
};

export const useTypeaheadBuffer = (onPrefix: (prefix: string) => void) => {
  const [buffer, setBuffer] = useState("");
  useEffect(() => {
    if (!buffer) return;
    const id = setTimeout(() => setBuffer(""), 500);
    return () => clearTimeout(id);
  }, [buffer]);

  function onKeyDown(e: KeyboardEvent) {
    if (
      e.key.length !== 1 ||
      !/\S/.test(e.key) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    )
      return;
    const next = buffer + e.key.toLowerCase();
    setBuffer(next);
    onPrefix(next);
  }

  return { onKeyDown };
};

export const useScrollActiveIntoView = (
  containerRef: RefObject<HTMLElement | null>,
  activeRowIndex: number,
  open: boolean,
) => {
  useEffect(() => {
    if (!open || activeRowIndex < 0) return;
    const el = containerRef.current;
    if (!el) return;
    const top = activeRowIndex * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (bottom > el.scrollTop + el.clientHeight)
      el.scrollTop = bottom - el.clientHeight;
  }, [activeRowIndex, open, containerRef]);
};

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export type { Row };
