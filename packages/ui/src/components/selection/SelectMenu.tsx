import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  FieldLabel,
  FieldFooter,
  useFieldIds,
  describedBy,
} from "../form/shared";
import {
  type SelectOption,
  buildRows,
  rowDomId,
  useActiveRow,
  useScrollActiveIntoView,
  useTypeaheadBuffer,
  VirtualListbox,
  popoverContentClasses,
  triggerBaseClasses,
} from "./shared";

export interface SelectMenuProps {
  options: readonly SelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  label?: string | undefined;
  valuePrefix?: string | undefined;

  "aria-label"?: string | undefined;
  placeholder?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;

  maxListHeight?: number | undefined;
}

export const SelectMenu = ({
  options,
  value,
  onChange,
  label,
  valuePrefix,
  "aria-label": ariaLabel,
  placeholder = "Select…",
  hint,
  error,
  required,
  disabled,
  id,
  className,
  maxListHeight = 320,
}: SelectMenuProps) => {
  const [open, setOpen] = useState(false);
  const { fieldId, hintId, errorId } = useFieldIds(id);
  const listboxId = useId();
  const listRef = useRef<HTMLUListElement>(null);

  const rows = buildRows(options);
  const selectedOption = options.find((o) => o.value === value);

  const commitRow = (rowIndex: number) => {
    const row = rows[rowIndex];
    if (row?.kind !== "option" || row.option.disabled) return;
    onChange(row.option.value);
    setOpen(false);
  };

  const { activeRowIndex, setActiveRowIndex, onKeyDown, typeahead } =
    useActiveRow(rows, commitRow);
  const { onKeyDown: onTypeaheadKeyDown } = useTypeaheadBuffer(typeahead);
  useScrollActiveIntoView(listRef, activeRowIndex, open);

  useEffect(() => {
    if (!open) return;
    const selectedRow = rows.findIndex(
      (r) => r.kind === "option" && r.option.value === value,
    );
    if (selectedRow >= 0) setActiveRowIndex(selectedRow);
  }, [open]);

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (
      !open &&
      (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter")
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    onKeyDown(e);
    onTypeaheadKeyDown(e);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            id={fieldId}
            disabled={disabled}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={
              open && activeRowIndex >= 0
                ? rowDomId(listboxId, activeRowIndex)
                : undefined
            }
            aria-label={label ? undefined : ariaLabel}
            aria-required={required || undefined}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy(hintId, errorId, hint, error)}
            onKeyDown={handleTriggerKeyDown}
            className={cn(
              triggerBaseClasses,
              error
                ? "border-danger focus:ring-danger"
                : "border-border focus:ring-primary",
              className,
            )}
          >
            <span
              className={cn(
                "truncate",
                !selectedOption && "text-text-secondary",
              )}
            >
              {selectedOption
                ? `${valuePrefix ? `${valuePrefix}: ` : ""}${selectedOption.label}`
                : placeholder}
            </span>
            <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            side="bottom"
            sideOffset={4}
            collisionPadding={12}
            sticky="always"
            className={cn(
              popoverContentClasses,
              "w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)]",
            )}
            onWheel={(event) => event.stopPropagation()}
            onTouchMove={(event) => event.stopPropagation()}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <VirtualListbox
              rows={rows}
              listboxId={listboxId}
              listRef={listRef}
              activeRowIndex={activeRowIndex}
              maxHeight={maxListHeight}
              isSelected={(opt) => opt.value === value}
              onCommitRow={commitRow}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <FieldFooter
        hint={hint}
        error={error}
        hintId={hintId}
        errorId={errorId}
      />
    </div>
  );
};
