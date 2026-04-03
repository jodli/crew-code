import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CardSkeleton, PageSkeleton } from "./skeleton.tsx";

describe("CardSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("contains pulse animation elements", () => {
    const { container } = render(<CardSkeleton />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});

describe("PageSkeleton", () => {
  it("renders 3 card skeletons by default", () => {
    const { container } = render(<PageSkeleton />);
    // CardSkeleton has the class bg-bg-surface
    const cards = container.querySelectorAll(".bg-bg-surface");
    expect(cards.length).toBe(3);
  });

  it("renders specified number of card skeletons", () => {
    const { container } = render(<PageSkeleton cards={5} />);
    const cards = container.querySelectorAll(".bg-bg-surface");
    expect(cards.length).toBe(5);
  });
});
