import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CategoryTabs } from "@/features/menu/components/CategoryTabs";

const categories = [
  {
    id: "c1",
    name: "Starters",
    tenantId: "t1",
    branchId: null,
    description: null,
    isActive: true,
    sortOrder: 0,
  },
];

describe("CategoryTabs", () => {
  it("renders category filters and hides categories during search", () => {
    expect(
      renderToStaticMarkup(
        <CategoryTabs
          foodTypeFilter="ALL"
          onFoodTypeChange={vi.fn()}
          categories={categories}
          activeCategory="c1"
          onCategoryChange={vi.fn()}
          menuSearch=""
        />,
      ),
    ).toContain("Starters");
    expect(
      renderToStaticMarkup(
        <CategoryTabs
          foodTypeFilter="VEG"
          onFoodTypeChange={vi.fn()}
          categories={categories}
          activeCategory={null}
          onCategoryChange={vi.fn()}
          menuSearch="burger"
        />,
      ),
    ).not.toContain("Starters");
  });
});
