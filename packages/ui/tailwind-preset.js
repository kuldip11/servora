import tailwindcssAnimate from "tailwindcss-animate";

export default {
  theme: {
    extend: {
      transitionDuration: {
        instant: "100ms",
        fast: "150ms",
        base: "200ms",
        slow: "300ms",
        slower: "500ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        decelerate: "cubic-bezier(0, 0, 0.2, 1)",
        accelerate: "cubic-bezier(0.4, 0, 1, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },

        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out",
        shimmer: "shimmer 1.6s ease-in-out infinite",
      },
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-secondary": "var(--surface-secondary)",
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          disabled: "var(--text-disabled)",
        },
        border: "var(--border)",
        divider: "var(--divider)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          surface: "var(--primary-surface)",
          border: "var(--primary-border)",

          foreground: "var(--primary-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          surface: "var(--success-surface)",
          foreground: "var(--success-foreground)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          surface: "var(--warning-surface)",
          foreground: "var(--warning-foreground)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          surface: "var(--danger-surface)",
          foreground: "var(--danger-foreground)",
        },
        info: {
          DEFAULT: "var(--info)",
          surface: "var(--info-surface)",
          foreground: "var(--info-foreground)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        elevated: "var(--shadow-md)",
        card: "var(--shadow-sm)",
        dropdown: "var(--shadow-dropdown)",
      },
      spacing: {
        xs: "var(--spacing-xs)",
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },

  plugins: [tailwindcssAnimate],
};
