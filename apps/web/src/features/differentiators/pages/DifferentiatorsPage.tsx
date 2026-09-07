import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createMenuApi } from "@pos/api-client";
import { Button, Page, PageHeader, toast } from "@pos/ui";
import { ApprovalRulesPanel } from "@/features/differentiators/components/ApprovalRulesPanel";
import { AvailabilityPanel } from "@/features/differentiators/components/AvailabilityPanel";
import { EngineeringPanel } from "@/features/differentiators/components/EngineeringPanel";
import {
  GuidedBuilderPanel,
  type MenuChoice,
} from "@/features/differentiators/components/GuidedBuilderPanel";
import { OrderExplainPanel } from "@/features/differentiators/components/OrderExplainPanel";
import { apiClient, extractApiError } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);

type Tab = "availability" | "engineering" | "explain" | "builder" | "approvals";

const tabs: Array<[Tab, string]> = [
  ["availability", "Live availability"],
  ["engineering", "Menu engineering"],
  ["explain", "Order explain"],
  ["builder", "Guided builder"],
  ["approvals", "Approval rules"],
];

export const DifferentiatorsPage = () => {
  const [tab, setTab] = useState<Tab>("availability");
  const menuChoicesQuery = useQuery<MenuChoice[]>({
    queryKey: ["differentiators", "menu-choices"],
    queryFn: async () => {
      const categories = await menuApi.listCategories();
      return categories.flatMap((category) =>
        (category.menuItems ?? [])
          .filter((item) => item.isPublished && item.status !== "DISCONTINUED")
          .map((item) => ({
            id: item.id,
            name: item.name,
            categoryName: category.name,
          })),
      );
    },
    retry: false,
  });

  useEffect(() => {
    if (menuChoicesQuery.error) {
      toast({ title: extractApiError(menuChoicesQuery.error), tone: "danger" });
    }
  }, [menuChoicesQuery.error]);

  const menuChoices = menuChoicesQuery.data ?? [];

  return (
    <Page>
      <PageHeader
        title="Differentiators"
        description="Deterministic order explanations, live availability, menu engineering, guided authoring, and approval controls."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <Button
            key={id}
            variant={tab === id ? "primary" : "secondary"}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "availability" && <AvailabilityPanel />}
      {tab === "engineering" && <EngineeringPanel />}
      {tab === "explain" && <OrderExplainPanel />}
      {tab === "builder" && <GuidedBuilderPanel menuChoices={menuChoices} />}
      {tab === "approvals" && <ApprovalRulesPanel />}
    </Page>
  );
};

export default DifferentiatorsPage;
