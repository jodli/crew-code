import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Dropdown } from "./dropdown.tsx";

const items = [
  { label: "Edit", onSelect: vi.fn() },
  { label: "Delete", danger: true, onSelect: vi.fn() },
];

function renderDropdown(overrides?: { items?: typeof items }) {
  return render(<Dropdown trigger={<button type="button">Menu</button>} items={overrides?.items ?? items} />);
}

describe("Dropdown", () => {
  it("shows menu items when trigger is clicked", async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByText("Menu"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("hides menu when clicking outside", async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByText("Menu"));
    expect(screen.getByText("Edit")).toBeInTheDocument();

    // Click outside the dropdown
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("hides menu on Escape key", async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByText("Menu"));
    expect(screen.getByText("Edit")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("calls onSelect and closes menu when item is clicked", async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByText("Menu"));
    await user.click(screen.getByText("Edit"));

    expect(items[0].onSelect).toHaveBeenCalled();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("renders danger item with error styling", async () => {
    const user = userEvent.setup();
    renderDropdown();

    await user.click(screen.getByText("Menu"));
    const deleteItem = screen.getByText("Delete");
    expect(deleteItem.className).toContain("text-error");
  });
});
