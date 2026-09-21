import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoodTypeDot } from "../FoodTypeDot";

describe("FoodTypeDot", () => {
  it("renders food types, sizes and fallback", () => {
    const { rerender } = render(<FoodTypeDot type="VEG" size="sm" />);
    expect(screen.getByTitle("Veg")).toBeTruthy();
    rerender(<FoodTypeDot type="NON_VEG" />);
    expect(screen.getByTitle("Non-Veg")).toBeTruthy();
    rerender(<FoodTypeDot type={"UNKNOWN" as never} />);
    expect(screen.getByTitle("Veg")).toBeTruthy();
  });
});
