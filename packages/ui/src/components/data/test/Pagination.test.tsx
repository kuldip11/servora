import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../Pagination";

describe("Pagination", () => {
  it("renders the current range and changes pages", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        page={2}
        pageCount={5}
        pageSize={10}
        totalItems={42}
        onPageChange={onPageChange}
      />,
    );
    expect(screen.getByText(/Showing/)).toHaveTextContent(
      "Showing 11–20 of 42",
    );
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
  it("disables previous on the first page and supports page-size changes", async () => {
    const user = userEvent.setup();
    const onSize = vi.fn();
    render(
      <Pagination
        page={1}
        pageCount={10}
        pageSize={10}
        onPageChange={() => {}}
        onPageSizeChange={onSize}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("combobox", { name: "Rows per page" }));
    await user.click(screen.getByRole("option", { name: "25" }));
    expect(onSize).toHaveBeenCalledWith(25);
  });
});
