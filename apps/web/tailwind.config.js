import uiPreset from "../../packages/ui/tailwind-preset.js";

export default {
  presets: [uiPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        4.5: "1.125rem",
        13: "3.25rem",
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
