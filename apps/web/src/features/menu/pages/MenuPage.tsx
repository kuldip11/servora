import { ArrowLeft, ListChecks, Upload } from "lucide-react";
import { Button, Page, PageHeader, Tabs, type TabItem } from "@pos/ui";
import { ItemFormModal } from "@/features/menu/components/ItemFormModal";
import { MenuItemsContent } from "@/features/menu/components/MenuItemsContent";
import { MenuCategoriesSection } from "@/features/menu/components/MenuCategoriesSection";
import { MenuSpecializedSection } from "@/features/menu/components/MenuSpecializedSection";
import { ModifierGroupsSection } from "@/features/menu/components/ModifierGroupsSection";
import { TagsSection } from "@/features/menu/components/TagsSection";
import { HolidaysSection } from "@/features/menu/components/HolidaysSection";
import {
  TemplatesSection,
  SaveTemplateModal,
} from "@/features/menu/components/TemplatesSection";
import { ExportMenu } from "@/features/menu/components/ExportMenu";
import { ImportWizard } from "@/features/menu/components/ImportWizard";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import { useToggleItemAvailability } from "@/features/menu/hooks/useToggleItemAvailability";
import { useDeleteMenuItem } from "@/features/menu/hooks/useDeleteMenuItem";
import { useDuplicateMenuItem } from "@/features/menu/hooks/useDuplicateMenuItem";
import { useSetItemPublished } from "@/features/menu/hooks/useSetItemPublished";
import { MenusSection } from "@/features/menu/components/MenusSection";
import { KitchenStationsSection } from "@/features/menu/components/KitchenStationsSection";
import { CombosSection } from "@/features/menu/components/CombosSection";
import { PromotionsSection } from "@/features/menu/components/PromotionsSection";
import { LoyaltySection } from "@/features/menu/components/LoyaltySection";
import { HappyHourSection } from "@/features/menu/components/HappyHourSection";
import { CustomerGroupsSection } from "@/features/menu/components/CustomerGroupsSection";
import { BuffetPricingSection } from "@/features/menu/components/BuffetPricingSection";
import { OrganizationManagementSection } from "@/features/menu/components/OrganizationManagementSection";
import {
  MENU_ADVANCED_SECTION,
  MENU_MORE_SECTIONS,
  type MenuMoreSectionId,
  type MenuTabId,
} from "@/features/menu/constants";
import { useMenuPageState } from "@/features/menu/hooks/useMenuPageState";

export const MenuPage = () => {
  const {
    tab,
    moreSection,
    showImport,
    savingTemplateFor,
    selectMode,
    selectedIds,
    itemForm,
    itemSearch,
    foodTypeFilter,
    statusFilter,
    publishFilter,
    setTab,
    toggleSelectMode,
    setMoreSection,
    setShowImport,
    setSavingTemplateFor,
    setSelectedIds,
    setItemForm,
    setItemSearch,
    setFoodTypeFilter,
    setStatusFilter,
    setPublishFilter,
  } = useMenuPageState();

  const { data: categories, isLoading } = useMenuCategories();
  const { data: tags } = useMenuTags();
  const toggleAvailMutation = useToggleItemAvailability();
  const deleteItemMutation = useDeleteMenuItem();
  const duplicateItemMutation = useDuplicateMenuItem();
  const publishMutation = useSetItemPublished();

  const itemsContent = (
    <MenuItemsContent
      itemSearch={itemSearch}
      setItemSearch={setItemSearch}
      selectMode={selectMode}
      selectedIds={selectedIds}
      categories={categories ?? []}
      tags={tags ?? []}
      isLoading={isLoading}
      foodTypeFilter={foodTypeFilter}
      statusFilter={statusFilter}
      publishFilter={publishFilter}
      setFoodTypeFilter={setFoodTypeFilter}
      setStatusFilter={setStatusFilter}
      setPublishFilter={setPublishFilter}
      setSelectedIds={setSelectedIds}
      setItemForm={setItemForm}
      toggleAvailMutation={toggleAvailMutation}
      deleteItemMutation={deleteItemMutation}
      duplicateItemMutation={duplicateItemMutation}
      publishMutation={publishMutation}
    />
  );

  const toolsContent = (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-text-primary">
          Import & Export
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Move menu data in bulk.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4" /> Import Items
          </Button>
          <ExportMenu />
        </div>
      </section>
      <TemplatesSection />
      <TagsSection />
      <HolidaysSection />
    </div>
  );

  const moreContentBySection: Record<MenuMoreSectionId, React.ReactNode> = {
    menus: <MenusSection />,
    offers: (
      <div className="space-y-10">
        <CombosSection />
        <PromotionsSection />
        <LoyaltySection />
        <HappyHourSection />
      </div>
    ),
    operations: (
      <div className="space-y-10">
        <MenuSpecializedSection mode="recipes" />
        <KitchenStationsSection />
      </div>
    ),
    tools: toolsContent,
    advanced: (
      <div className="space-y-10">
        <CustomerGroupsSection />
        <BuffetPricingSection />
        <OrganizationManagementSection />
      </div>
    ),
  };

  const moreContent = moreSection ? (
    <div className="space-y-5">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
        onClick={() => setMoreSection(null)}
      >
        <ArrowLeft className="h-4 w-4" /> Back to More
      </button>
      {moreContentBySection[moreSection]}
    </div>
  ) : (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        {MENU_MORE_SECTIONS.map((section) => (
          <button
            type="button"
            key={section.id}
            onClick={() => setMoreSection(section.id)}
            className="rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-primary-surface/30"
          >
            <p className="font-semibold text-text-primary">{section.title}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {section.description}
            </p>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMoreSection(MENU_ADVANCED_SECTION.id)}
        className="text-sm font-medium text-text-secondary underline-offset-4 hover:text-primary hover:underline"
      >
        {MENU_ADVANCED_SECTION.title}
      </button>
    </div>
  );

  const tabItems: TabItem[] = [
    { value: "items", label: "Items", content: itemsContent },
    {
      value: "categories",
      label: "Categories",
      content: <MenuCategoriesSection onSaveTemplate={setSavingTemplateFor} />,
    },
    {
      value: "modifiers",
      label: "Modifiers",
      content: <ModifierGroupsSection />,
    },
    { value: "more", label: "More", content: moreContent },
  ];

  return (
    <Page>
      <PageHeader
        title="Menu"
        description={`${categories?.length ?? 0} categories`}
        actions={
          tab === "items" ? (
            <Button
              variant={selectMode ? "primary" : "secondary"}
              onClick={toggleSelectMode}
            >
              <ListChecks className="w-4 h-4" />
              {selectMode ? "Done selecting" : "Select items"}
            </Button>
          ) : undefined
        }
      />

      <Tabs
        items={tabItems}
        value={tab}
        onValueChange={(value) => setTab(value as MenuTabId)}
      />

      {showImport && <ImportWizard onClose={() => setShowImport(false)} />}
      {savingTemplateFor && (
        <SaveTemplateModal
          category={savingTemplateFor}
          onClose={() => setSavingTemplateFor(null)}
        />
      )}
      {itemForm && (
        <ItemFormModal
          categoryId={itemForm.categoryId}
          item={itemForm.item}
          onClose={() => setItemForm(null)}
        />
      )}
    </Page>
  );
};
