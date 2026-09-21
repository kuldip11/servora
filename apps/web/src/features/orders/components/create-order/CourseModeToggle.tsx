type CourseModeToggleProps = {
  checked: boolean;
  onChange: (enabled: boolean) => void;
};

export const CourseModeToggle = ({
  checked,
  onChange,
}: CourseModeToggleProps) => (
  <label className="mb-4 flex items-center gap-2 rounded-md border border-border bg-surface-secondary px-3 py-2 text-sm text-text-secondary">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span>
      <strong className="text-text-primary">Course mode</strong> — assign lines
      to courses; later courses are held until fired.
    </span>
  </label>
);
