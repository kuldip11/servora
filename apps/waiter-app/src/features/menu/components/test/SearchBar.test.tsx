import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/features/menu/components/SearchBar";

describe("SearchBar", () => {
  it("renders the menu search input", () => {
    expect(
      renderToStaticMarkup(<SearchBar value="burger" onChange={vi.fn()} />),
    ).toContain("Search dishes or scan code");
  });
});
