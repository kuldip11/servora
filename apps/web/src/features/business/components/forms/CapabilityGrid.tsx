import { checkboxClass } from "./business-form-defaults";

export const CapabilityGrid = ({
  values,
  setValue,
  prefix = "",
}: {
  values: Record<string, boolean>;
  setValue: (key: string, value: boolean) => void;
  prefix?: string;
}) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {Object.entries(values).map(([key, value]) => (
      <label
        key={key}
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
      >
        <input
          className={checkboxClass}
          type="checkbox"
          checked={value}
          onChange={(event) => setValue(key, event.target.checked)}
        />
        {prefix}
        {key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (letter) => letter.toUpperCase())}
      </label>
    ))}
  </div>
);
