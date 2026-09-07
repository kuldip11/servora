import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  categories: [{ id: "c1", name: "Main" }],
  tags: [{ id: "t1", name: "Spicy" }],
}));

vi.mock("@/features/menu/hooks/useMenuCategories", () => ({ useMenuCategories: () => ({ data: mocks.categories, isLoading: false }) }));
vi.mock("@/features/menu/hooks/useMenuTags", () => ({ useMenuTags: () => ({ data: mocks.tags }) }));
vi.mock("@/features/menu/hooks/useToggleItemAvailability", () => ({ useToggleItemAvailability: () => ({ mutate: vi.fn() }) }));
vi.mock("@/features/menu/hooks/useDeleteMenuItem", () => ({ useDeleteMenuItem: () => ({ mutate: vi.fn() }) }));
vi.mock("@/features/menu/hooks/useDuplicateMenuItem", () => ({ useDuplicateMenuItem: () => ({ mutate: vi.fn() }) }));
vi.mock("@/features/menu/hooks/useSetItemPublished", () => ({ useSetItemPublished: () => ({ mutate: vi.fn() }) }));

vi.mock("@pos/ui", () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Page: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
  PageHeader: ({ title, description, actions }: any) => <header><h1>{title}</h1><p>{description}</p>{actions}</header>,
  Tabs: ({ items, value, onValueChange }: any) => <div><div>{items.map((item: any) => <button key={item.value} onClick={() => onValueChange(item.value)}>{item.label}</button>)}</div>{items.find((item: any) => item.value === value)?.content}</div>,
}));

vi.mock("@/features/menu/components/MenuItemsContent", () => ({ MenuItemsContent: ({ setItemForm }: any) => <div>items-content<button onClick={() => setItemForm({ categoryId: "c1", item: null })}>open item</button></div> }));
vi.mock("@/features/menu/components/MenuCategoriesSection", () => ({ MenuCategoriesSection: ({ onSaveTemplate }: any) => <div>categories-content<button onClick={() => onSaveTemplate({ id: "c1", name: "Main" })}>save template</button></div> }));
vi.mock("@/features/menu/components/MenuSpecializedSection", () => ({ MenuSpecializedSection: () => <div>recipes</div> }));
vi.mock("@/features/menu/components/ModifierGroupsSection", () => ({ ModifierGroupsSection: () => <div>modifiers-content</div> }));
vi.mock("@/features/menu/components/TagsSection", () => ({ TagsSection: () => <div>tags</div> }));
vi.mock("@/features/menu/components/HolidaysSection", () => ({ HolidaysSection: () => <div>holidays</div> }));
vi.mock("@/features/menu/components/TemplatesSection", () => ({ TemplatesSection: () => <div>templates</div>, SaveTemplateModal: ({ onClose }: any) => <div data-testid="template-modal"><button onClick={onClose}>close template</button></div> }));
vi.mock("@/features/menu/components/ExportMenu", () => ({ ExportMenu: () => <div>export</div> }));
vi.mock("@/features/menu/components/ImportWizard", () => ({ ImportWizard: ({ onClose }: any) => <div data-testid="import"><button onClick={onClose}>close import</button></div> }));
vi.mock("@/features/menu/components/ItemFormModal", () => ({ ItemFormModal: ({ onClose }: any) => <div data-testid="item-modal"><button onClick={onClose}>close item</button></div> }));
vi.mock("@/features/menu/components/MenusSection", () => ({ MenusSection: () => <div>menus-section</div> }));
vi.mock("@/features/menu/components/KitchenStationsSection", () => ({ KitchenStationsSection: () => <div>stations</div> }));
vi.mock("@/features/menu/components/CombosSection", () => ({ CombosSection: () => <div>combos</div> }));
vi.mock("@/features/menu/components/PromotionsSection", () => ({ PromotionsSection: () => <div>promotions</div> }));
vi.mock("@/features/menu/components/LoyaltySection", () => ({ LoyaltySection: () => <div>loyalty</div> }));
vi.mock("@/features/menu/components/HappyHourSection", () => ({ HappyHourSection: () => <div>happy-hour</div> }));
vi.mock("@/features/menu/components/CustomerGroupsSection", () => ({ CustomerGroupsSection: () => <div>customer-groups</div> }));
vi.mock("@/features/menu/components/BuffetPricingSection", () => ({ BuffetPricingSection: () => <div>buffet</div> }));
vi.mock("@/features/menu/components/OrganizationManagementSection", () => ({ OrganizationManagementSection: () => <div>organization</div> }));
vi.mock("@/features/menu/constants", () => ({
  MENU_MORE_SECTIONS: [
    { id: "menus", title: "Menus", description: "menus" },
    { id: "offers", title: "Offers", description: "offers" },
    { id: "operations", title: "Operations", description: "ops" },
    { id: "tools", title: "Tools", description: "tools" },
  ],
  MENU_ADVANCED_SECTION: { id: "advanced", title: "Advanced", description: "advanced" },
}));

import { MenuPage } from "../MenuPage";

describe("MenuPage coverage", () => {
  beforeEach(() => { mocks.categories = [{ id: "c1", name: "Main" }]; });

  it("drives primary tabs, selection, item modal and template modal", () => {
    render(<MenuPage />);
    expect(screen.getByText("1 categories")).toBeTruthy();
    fireEvent.click(screen.getByText("Select items"));
    expect(screen.getByText("Done selecting")).toBeTruthy();
    fireEvent.click(screen.getByText("open item"));
    expect(screen.getByTestId("item-modal")).toBeTruthy();
    fireEvent.click(screen.getByText("close item"));
    fireEvent.click(screen.getByText("Categories"));
    fireEvent.click(screen.getByText("save template"));
    expect(screen.getByTestId("template-modal")).toBeTruthy();
    fireEvent.click(screen.getByText("close template"));
    fireEvent.click(screen.getByText("Modifiers"));
    expect(screen.getByText("modifiers-content")).toBeTruthy();
  });

  it("drives every More section and import flow", () => {
    render(<MenuPage />);
    fireEvent.click(screen.getByText("More"));
    for (const entry of [["Menus", "menus-section"], ["Offers", "combos"], ["Operations", "recipes"]] as const) {
      fireEvent.click(screen.getByText(entry[0]));
      expect(screen.getByText(entry[1])).toBeTruthy();
      fireEvent.click(screen.getByText("Back to More"));
    }
    fireEvent.click(screen.getByText("Tools"));
    fireEvent.click(screen.getByText("Import Items"));
    expect(screen.getByTestId("import")).toBeTruthy();
    fireEvent.click(screen.getByText("close import"));
    fireEvent.click(screen.getByText("Back to More"));
    fireEvent.click(screen.getByText("Advanced"));
    expect(screen.getByText("customer-groups")).toBeTruthy();
  });

  it("handles missing category data", () => {
    mocks.categories = [];
    render(<MenuPage />);
    expect(screen.getByText("0 categories")).toBeTruthy();
  });
});
