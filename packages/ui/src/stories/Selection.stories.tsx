import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SelectMenu } from "../index";

const meta = {
  title: "Foundation/Selection",
  component: SelectMenu,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof SelectMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

const options = [
  { value: "ranchi", label: "Ranchi Main" },
  { value: "kolkata", label: "Kolkata Central" },
  { value: "divider", label: "Unavailable branch", disabled: true },
];

export const SelectMenuStates: Story = {
  args: {
    options,
    value: "ranchi",
    onChange: () => undefined,
    label: "Branch",
  },
  render: () => {
    const Example = () => {
      const [value, setValue] = useState("ranchi");
      return (
        <div className="grid max-w-sm gap-5">
          <SelectMenu
            options={options}
            value={value}
            onChange={setValue}
            label="Branch"
            hint="Keyboard and typeahead enabled"
          />
          <SelectMenu
            options={options}
            value={undefined}
            onChange={() => undefined}
            label="Required branch"
            required
            error="Select a branch"
          />
        </div>
      );
    };
    return <Example />;
  },
};
