import type { Preview } from "@storybook/react";
import "../src/theme/tokens.css";
import "./storybook.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: { expanded: true },
    a11y: { test: "error" },
    backgrounds: { default: "surface" },
  },
};

export default preview;
