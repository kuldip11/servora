const jsxA11y = require("eslint-plugin-jsx-a11y");
const tsParser = require("@typescript-eslint/parser");
const tsEslint = require("@typescript-eslint/eslint-plugin");
const reactHooks = require("eslint-plugin-react-hooks");
const importX = require("eslint-plugin-import-x");

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "import-x": importX,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-self-import": "error",
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: { "jsx-a11y": jsxA11y },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,

      // Explicit per the project's accessibility engineering rules
      // (docs/accessibility/00-PLAN.md §3), stated here rather than left
      // implicit in the "recommended" preset:

      // "Never use positive tabindex." `no-noninteractive-tabindex`
      // (in recommended) catches misuse on non-interactive elements;
      // this catches the positive-integer case specifically, on *any*
      // element, interactive or not — a positive tabIndex reorders the
      // whole page's tab sequence and is never the right fix.
      "jsx-a11y/tabindex-no-positive": "error",

      // "ARIA should never replace semantic HTML." Forces a real
      // interactive element (or an explicit, deliberate exception) over
      // e.g. `<div role="button" onClick={...}>`.
      "jsx-a11y/no-static-element-interactions": "error",
      "jsx-a11y/no-noninteractive-element-interactions": "error",

      // Every keyboard handler needs a real interactive target so it's
      // actually reachable by keyboard, not just mouse/pointer.
      "jsx-a11y/click-events-have-key-events": "error",
      "jsx-a11y/no-autofocus": "warn",
    },
  },
  {
    files: [
      "apps/*/src/**/*.{ts,tsx}",
      "apps/website/{app,components,content,lib}/**/*.{ts,tsx}",
      "packages/*/src/**/*.{ts,tsx}",
    ],
    ignores: ["packages/ui/src/stories/**"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsEslint,
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
];
