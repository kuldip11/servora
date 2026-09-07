import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { listCombos, updateCombo, createCombo, removeCombo } = vi.hoisted(
  () => ({
    listCombos: vi.fn(),
    updateCombo: vi.fn(),
    createCombo: vi.fn(),
    removeCombo: vi.fn(),
  }),
);

vi.mock("@pos/api-client", () => ({
  createMenuApi: () => ({ listCombos, updateCombo, createCombo, removeCombo }),
}));
vi.mock("@/features/menu/hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({
    data: [
      {
        id: "category-1",
        name: "Mains",
        menuItems: [
          {
            id: "item-1",
            name: "Chicken Tikka",
            isPublished: true,
            status: "ACTIVE",
            variants: [{ id: "variant-1", name: "Half" }],
          },
        ],
      },
    ],
  }),
}));
vi.mock("@/shared/lib/query-client", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("@/shared/lib/api-client", () => ({
  apiClient: {},
  extractApiError: (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error",
}));

import { CombosSection } from "@/features/menu/components/CombosSection";

const renderSection = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CombosSection />
    </QueryClientProvider>,
  );
};

describe("CombosSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });
  it("loads an existing combo into the editor and saves a structural update", async () => {
    listCombos.mockResolvedValue([
      {
        id: "combo-1",
        name: "Lunch Combo",
        description: "Main + side",
        pricePolicy: "FIXED",
        fixedPrice: "299.00",
        percentOff: null,
        slots: [
          {
            id: "slot-1",
            name: "Main",
            minSelections: 1,
            maxSelections: 1,
            options: [
              {
                id: "option-1",
                menuItemId: "item-1",
                variantId: "variant-1",
                upcharge: "10.00",
                isUnlimitedRefill: false,
              },
            ],
          },
        ],
      },
    ]);
    updateCombo.mockResolvedValue({ id: "combo-1" });

    renderSection();
    await screen.findByText("Lunch Combo");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    const name = screen.getByLabelText("Combo name");
    fireEvent.change(name, { target: { value: "Dinner Combo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save combo" }));

    await waitFor(() =>
      expect(updateCombo).toHaveBeenCalledWith(
        "combo-1",
        expect.objectContaining({
          name: "Dinner Combo",
          fixedPrice: 299,
          slots: [
            expect.objectContaining({
              name: "Main",
              options: [
                expect.objectContaining({
                  menuItemId: "item-1",
                  variantId: "variant-1",
                  upcharge: 10,
                }),
              ],
            }),
          ],
        }),
      ),
    );
  });

  it("creates percent combos and covers slot/choice controls, refill, cancel and delete", async () => {
    listCombos.mockResolvedValue([
      {
        id: "combo-2",
        name: "Refill Combo",
        description: null,
        pricePolicy: "PERCENT_OFF_SUM",
        fixedPrice: null,
        percentOff: "15",
        slots: [
          {
            id: "slot-2",
            name: "Drink",
            minSelections: 1,
            maxSelections: 1,
            options: [
              {
                id: "option-2",
                menuItemId: "item-1",
                variantId: null,
                upcharge: 0,
                isUnlimitedRefill: true,
              },
            ],
          },
        ],
      },
    ]);
    createCombo.mockResolvedValue({ id: "new" });
    removeCombo.mockResolvedValue(undefined);

    renderSection();
    await screen.findByText("Refill Combo");
    expect(screen.getByText("Refill-enabled")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Combo name"), {
      target: { value: "Weekend Combo" },
    });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "  Deal  " },
    });
    fireEvent.change(screen.getByLabelText("Pricing"), {
      target: { value: "PERCENT_OFF_SUM" },
    });
    fireEvent.change(screen.getByLabelText("Percent off"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Choice 1"), {
      target: { value: "item-1" },
    });
    fireEvent.change(screen.getByLabelText("Variant"), {
      target: { value: "variant-1" },
    });
    fireEvent.change(screen.getByLabelText("Upcharge"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByLabelText("Refill"));

    fireEvent.click(screen.getByRole("button", { name: "+ Add choice" }));
    const choices = screen.getAllByLabelText(/Choice/);
    fireEvent.change(choices[1]!, { target: { value: "item-1" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[1]!);

    fireEvent.click(screen.getByRole("button", { name: "+ Add slot" }));
    expect(screen.getByLabelText("Slot 2")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Remove slot" })[1]!);

    fireEvent.click(screen.getByRole("button", { name: "Create combo" }));
    await waitFor(() =>
      expect(createCombo).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Weekend Combo",
          description: "Deal",
          pricePolicy: "PERCENT_OFF_SUM",
          percentOff: 20,
          slots: [
            expect.objectContaining({
              options: [
                expect.objectContaining({
                  menuItemId: "item-1",
                  variantId: "variant-1",
                  upcharge: 5,
                  isUnlimitedRefill: true,
                }),
              ],
            }),
          ],
        }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel edit" }));
    expect(
      (screen.getByLabelText("Combo name") as HTMLInputElement).value,
    ).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(removeCombo).toHaveBeenCalledWith("combo-2"));
  });

  it("keeps invalid percent and slot configurations from saving", async () => {
    listCombos.mockResolvedValue([]);
    renderSection();
    fireEvent.change(screen.getByLabelText("Combo name"), {
      target: { value: "Bad" },
    });
    fireEvent.change(screen.getByLabelText("Pricing"), {
      target: { value: "PERCENT_OFF_SUM" },
    });
    fireEvent.change(screen.getByLabelText("Percent off"), {
      target: { value: "101" },
    });
    fireEvent.change(screen.getByLabelText("Choice 1"), {
      target: { value: "item-1" },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Create combo",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("Percent off"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText("Minimum"), {
      target: { value: "2" },
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Create combo",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("covers slot field updates and create/delete mutation error callbacks", async () => {
    listCombos.mockResolvedValue([
      {
        id: "combo-e",
        name: "Error Combo",
        description: null,
        pricePolicy: "FIXED",
        fixedPrice: 100,
        percentOff: null,
        slots: [
          {
            id: "s",
            name: "Only",
            minSelections: 1,
            maxSelections: 1,
            options: [
              {
                id: "o",
                menuItemId: "item-1",
                variantId: null,
                upcharge: 0,
                isUnlimitedRefill: false,
              },
            ],
          },
        ],
      },
    ]);
    createCombo.mockRejectedValueOnce(new Error("create failed"));
    removeCombo.mockRejectedValueOnce(new Error("delete failed"));
    renderSection();
    await screen.findByText("Error Combo");
    fireEvent.change(screen.getByLabelText("Combo name"), {
      target: { value: "New Error" },
    });
    fireEvent.change(screen.getByLabelText("Slot 1"), {
      target: { value: "Entrée" },
    });
    fireEvent.change(screen.getByLabelText("Minimum"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Maximum"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Choice 1"), {
      target: { value: "item-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create combo" }));
    await waitFor(() => expect(createCombo).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(removeCombo).toHaveBeenCalledWith("combo-e"));
  });

  it("covers sibling slot and option map branches while editing", async () => {
    listCombos.mockResolvedValue([]);
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "+ Add slot" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "+ Add choice" })[0]!,
    );

    const slots = screen.getAllByLabelText(/Slot \d/);
    fireEvent.change(slots[0]!, { target: { value: "Primary" } });
    const minimums = screen.getAllByLabelText("Minimum");
    const maximums = screen.getAllByLabelText("Maximum");
    fireEvent.change(minimums[0]!, { target: { value: "1" } });
    fireEvent.change(maximums[0]!, { target: { value: "2" } });

    const choices = screen.getAllByLabelText(/Choice \d/);
    fireEvent.change(choices[0]!, { target: { value: "item-1" } });
    fireEvent.change(choices[1]!, { target: { value: "item-1" } });
    const variants = screen.getAllByLabelText("Variant");
    fireEvent.change(variants[0]!, { target: { value: "variant-1" } });
    const upcharges = screen.getAllByLabelText("Upcharge");
    fireEvent.change(upcharges[0]!, { target: { value: "3" } });
    const refills = screen.getAllByLabelText("Refill");
    fireEvent.click(refills[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove slot" })[1]!);
  });
});
