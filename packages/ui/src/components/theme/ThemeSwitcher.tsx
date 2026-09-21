import { useMemo, type ComponentType } from "react";
import { Sun, Moon, Contrast } from "lucide-react";
import { Select } from "../Select";
import type { SelectOption } from "../selection/shared";
import { useTheme, type Theme } from "../../theme/ThemeProvider";

const THEME_ICONS: Record<Theme, ComponentType<{ className?: string }>> = {
  light: Sun,
  dark: Moon,
  "high-contrast": Contrast,
};

const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  "high-contrast": "High Contrast",
};

const THEME_ORDER: Theme[] = ["light", "dark", "high-contrast"];

export interface ThemeSwitcherProps {
  label?: string | undefined;
  id?: string | undefined;
  className?: string | undefined;
}

export const ThemeSwitcher = ({
  label = "Theme",
  id,
  className,
}: ThemeSwitcherProps) => {
  const { theme, setTheme } = useTheme();

  const options: SelectOption[] = useMemo(
    () =>
      THEME_ORDER.map((value) => ({
        value,
        label: THEME_LABELS[value],
        icon: THEME_ICONS[value],
      })),
    [],
  );

  return (
    <Select
      id={id}
      label={label}
      options={options}
      value={theme}
      onChange={(value) => setTheme(value as Theme)}
      className={className}
    />
  );
};
