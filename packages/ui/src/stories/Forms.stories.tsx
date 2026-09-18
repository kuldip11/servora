import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Mail } from "lucide-react";
import { Card, PasswordInput, SearchInput, TextArea, TextInput } from "../index";

const meta = { title: "Foundation/Forms", tags: ["autodocs"], parameters: { layout: "padded" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const InputStates: Story = {
  render: () => {
    const Example = () => {
      const [search, setSearch] = useState("Butter chicken");
      return <Card className="max-w-xl space-y-5">
        <TextInput label="Email" icon={Mail} placeholder="owner@servora.app" hint="Used for account notifications" />
        <TextInput label="Required field" required error="This field is required" defaultValue="" />
        <TextInput label="Loading field" loading defaultValue="Loading data" />
        <PasswordInput label="Password" defaultValue="secret-password" />
        <SearchInput aria-label="Search menu" value={search} onChange={(event) => setSearch(event.target.value)} onClear={() => setSearch("")} placeholder="Search menu" />
        <TextArea label="Operational reason" showCharCount maxLength={120} defaultValue="Temporarily unavailable due to stock." />
      </Card>;
    };
    return <Example />;
  },
};
