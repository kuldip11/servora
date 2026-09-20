import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Settings, Trash2 } from "lucide-react";
import {
  BottomSheet,
  Button,
  Dialog,
  DropdownMenu,
  Popover,
  Toaster,
  Tooltip,
  toast,
} from "../index";

const meta = {
  title: "Foundation/Overlays",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveOverlays: Story = {
  render: () => {
    const Example = () => {
      const [dialogOpen, setDialogOpen] = useState(false);
      const [sheetOpen, setSheetOpen] = useState(false);
      return (
        <div className="flex flex-wrap items-center gap-4 p-8">
          <Button onClick={() => setDialogOpen(true)}>Dialog</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Bottom sheet
          </Button>
          <Popover trigger={<Button variant="outline">Popover</Button>}>
            <p className="max-w-xs text-sm">
              Useful contextual content without leaving the current workflow.
            </p>
          </Popover>
          <DropdownMenu
            trigger={<Button variant="outline">Dropdown</Button>}
            items={[
              {
                type: "item",
                label: "Settings",
                icon: Settings,
                onSelect: () => undefined,
              },
              { type: "separator" },
              {
                type: "item",
                label: "Delete",
                icon: Trash2,
                danger: true,
                onSelect: () => undefined,
              },
            ]}
          />
          <Tooltip
            content="Keyboard and screen-reader accessible"
            trigger={<Button variant="ghost">Tooltip</Button>}
          />
          <Button
            variant="success"
            onClick={() =>
              toast({
                title: "Saved",
                description: "Changes are available across Servora.",
                tone: "success",
              })
            }
          >
            Toast
          </Button>
          <Toaster />
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Confirm action"
            description="Dialog example"
            footer={
              <>
                <Button
                  variant="secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
              </>
            }
          >
            <p className="text-sm text-text-secondary">
              Dialogs share focus management, keyboard dismissal and consistent
              spacing.
            </p>
          </Dialog>
          <BottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Mobile action"
            description="Bottom sheet example"
            footer={<Button onClick={() => setSheetOpen(false)}>Done</Button>}
          >
            <p className="text-sm text-text-secondary">
              Bottom sheets provide mobile-friendly actions.
            </p>
          </BottomSheet>
        </div>
      );
    };
    return <Example />;
  },
};
