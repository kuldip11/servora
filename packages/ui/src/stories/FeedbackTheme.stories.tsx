import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AppErrorBoundary, Button, ConnectivityBanner, ThemeProvider, ThemeSwitcher } from "../index";

const meta = { title: "Foundation/Feedback & Theme", tags: ["autodocs"], parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Boom = (): never => { throw new Error("Storybook boundary demonstration"); };

export const Connectivity: Story = {
  render: () => <div className="min-h-36 rounded-xl border border-border bg-surface p-6"><ConnectivityBanner disconnectedMessage="You’re offline. Changes may not sync until connection returns." restoredMessage="Connection restored. Servora is syncing." /><p className="text-sm text-text-secondary">Toggle browser network offline/online to exercise both states.</p></div>,
};

export const ThemeControls: Story = {
  render: () => <ThemeProvider defaultTheme="light"><div className="max-w-sm space-y-4"><ThemeSwitcher label="Application theme" /><p className="text-sm text-text-secondary">Light, dark and high-contrast themes share the same design tokens.</p></div></ThemeProvider>,
};

export const ErrorBoundary: Story = {
  render: () => {
    const Example = () => {
      const [broken, setBroken] = useState(false);
      return <AppErrorBoundary appName="Storybook example" onReset={() => setBroken(false)}>{broken ? <Boom /> : <Button variant="danger" onClick={() => setBroken(true)}>Trigger boundary</Button>}</AppErrorBoundary>;
    };
    return <Example />;
  },
};
