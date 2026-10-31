import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
} from "../SkeletonLoader";

describe("SkeletonLoader", () => {
  it("renders a configurable skeleton", () => {
    const { container } = render(
      <Skeleton height="2rem" width="50%" radius="full" />,
    );
    expect(container.firstElementChild).toHaveStyle({
      height: "2rem",
      width: "50%",
    });
  });
  it("renders the requested text lines and card/table placeholders", () => {
    render(
      <>
        <SkeletonText lines={3} />
        <SkeletonCard withMedia />
        <SkeletonTable rows={2} columns={3} />
      </>,
    );
    expect(
      document.querySelectorAll('[aria-hidden="true"]').length,
    ).toBeGreaterThan(1);
  });
});
