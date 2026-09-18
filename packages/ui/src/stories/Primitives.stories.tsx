import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, Bell, Package, Save, ShoppingBag } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Select,
  Spinner,
  StatCard,
  StatusBadge,
} from "../index";

const meta = {
  title: "Foundation/Primitives",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ButtonsAndIndicators: Story = {
  render: () => (
    <div className="grid gap-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Button variants</h2>
        <div className="flex flex-wrap gap-3">
          {(["primary", "secondary", "outline", "ghost", "danger", "success"] as const).map((variant) => (
            <Button key={variant} variant={variant}>{variant}</Button>
          ))}
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button><Save className="h-4 w-4" />Save</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Icon button</h2>
        <div className="flex gap-3">
          <IconButton icon={Bell} aria-label="Notifications" />
          <IconButton icon={Bell} aria-label="Notifications disabled" disabled />
          <IconButton icon={Bell} aria-label="Loading notifications" loading />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-3">
          {(["default", "success", "warning", "danger", "info"] as const).map((variant) => <Badge key={variant} variant={variant}>{variant}</Badge>)}
        </div>
        <div className="flex flex-wrap gap-3">
          {(["success", "warning", "danger", "info", "neutral"] as const).map((tone) => <StatusBadge key={tone} tone={tone} label={tone} dot />)}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Spinner</h2>
        <Spinner />
      </section>
    </div>
  ),
};

export const CardsStatsAndEmptyState: Story = {
  render: () => (
    <div className="grid gap-5 md:grid-cols-3">
      <StatCard title="Orders" value="142" subtitle="Today" icon={ShoppingBag} color="blue" trend={{ value: 8, label: "vs yesterday" }} />
      <StatCard title="Low stock" value="3" icon={Package} color="amber" trend={{ value: -2, label: "since morning" }} />
      <Card interactive><strong>Interactive card</strong><p className="mt-2 text-sm text-text-secondary">Reusable elevated surface.</p></Card>
      <div className="md:col-span-3"><EmptyState icon={AlertCircle} title="Nothing to review" description="All operational exceptions are resolved." action={<Button>Refresh</Button>} /></div>
    </div>
  ),
};

export const NativeSelectStates: Story = {
  render: () => {
    const Example = () => {
      const [value, setValue] = useState("AVAILABLE");
      return <div className="max-w-sm space-y-4"><Select label="Status" value={value} onChange={(event) => setValue(event.target.value)} options={[{ value: "AVAILABLE", label: "Available" }, { value: "UNAVAILABLE", label: "Unavailable" }]} /><Select label="Status with error" error="Choose a valid status" defaultValue="" options={[{ value: "", label: "Select status" }]} /></div>;
    };
    return <Example />;
  },
};
