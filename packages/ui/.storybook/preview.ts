import { createElement } from "react";
import type { Preview } from "@storybook/react";
import { TooltipProvider } from "../src/components/overlay/Tooltip";
import { ThemeProvider } from "../src/theme/ThemeProvider";
import "../src/theme/tokens.css";
import "./storybook.css";

const preview: Preview = {
  decorators: [
    (Story) =>
      createElement(
        ThemeProvider,
        { defaultTheme: "light" },
        createElement(
          TooltipProvider,
          { delayDuration: 200 },
          createElement(Story),
        ),
      ),
  ],
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: { expanded: true },
    a11y: { test: "error" },
    backgrounds: { default: "surface" },
  },
};

export default preview;
