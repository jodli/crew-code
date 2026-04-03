import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBanner, DisconnectedBanner } from "./error-banner.tsx";

describe("ErrorBanner", () => {
  it("shows the error message", () => {
    render(<ErrorBanner message="Something failed" />);
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("shows dismiss button when onDismiss is provided", async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<ErrorBanner message="Error" onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole("button");
    await user.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it("does not show dismiss button when onDismiss is not provided", () => {
    render(<ErrorBanner message="Error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("DisconnectedBanner", () => {
  it("shows disconnected message", () => {
    render(<DisconnectedBanner />);
    expect(screen.getByText("Server disconnected. Retrying...")).toBeInTheDocument();
  });
});
