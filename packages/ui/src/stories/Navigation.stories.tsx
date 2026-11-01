import type { Meta, StoryObj } from "@storybook/react";
import { Breadcrumbs, Card, SkipLink, Tabs } from "../index";

const meta = {
  title: "Foundation/Navigation",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const NavigationPatterns: Story = {
  render: () => (
    <div className="space-y-8">
      <SkipLink targetId="storybook-main-demo">Skip to demo content</SkipLink>
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "#" },
          { label: "Orders", href: "#" },
          { label: "ORD-1024" },
        ]}
      />
      <Tabs
        aria-label="Order views"
        items={[
          {
            value: "active",
            label: "Active",
            content: <Card>Active orders</Card>,
          },
          {
            value: "history",
            label: "History",
            content: <Card>Order history</Card>,
          },
          {
            value: "disabled",
            label: "Disabled",
            content: null,
            disabled: true,
          },
        ]}
      />
      <main id="storybook-main-demo" tabIndex={-1}>
        <Card>Skip-link destination</Card>
      </main>
    </div>
  ),
};
