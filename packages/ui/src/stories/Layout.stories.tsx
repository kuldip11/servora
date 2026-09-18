import type { Meta, StoryObj } from "@storybook/react";
import {
  Button,
  Card,
  Container,
  Grid,
  Page,
  PageHeader,
  Section,
  Stack,
} from "../index";

const meta = {
  title: "Foundation/Layout",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const LayoutPrimitives: Story = {
  render: () => (
    <Page contained>
      <Container size="xl">
        <Stack gap="lg">
          <PageHeader
            eyebrow="Operations"
            title="Branch overview"
            description="Page, container, stack and header primitives working together."
            actions={<Button>Primary action</Button>}
          />
          <Section
            title="Grid"
            description="Responsive layout primitives"
            actions={<Button variant="secondary">Manage</Button>}
          >
            <Grid columns={{ base: 1, md: 3 }} gap="md">
              {[1, 2, 3].map((item) => (
                <Card key={item}>Grid item {item}</Card>
              ))}
            </Grid>
          </Section>
          <Stack direction="row" gap="sm" wrap>
            <BadgeLike text="Row stack" />
            <BadgeLike text="Wrap" />
            <BadgeLike text="Alignment" />
          </Stack>
        </Stack>
      </Container>
    </Page>
  ),
};

const BadgeLike = ({ text }: { text: string }) => (
  <span className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
    {text}
  </span>
);
