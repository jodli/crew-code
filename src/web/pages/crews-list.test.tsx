import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { useLocation } from "wouter";
import { renderApp } from "../test/render.tsx";
import { server } from "../test/setup.ts";
import { CrewsListPage } from "./crews-list.tsx";

describe("CrewsListPage", () => {
  it("shows loading skeleton while fetching", () => {
    renderApp(<CrewsListPage />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders crew cards after loading", async () => {
    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
      expect(screen.getByText("my-feature")).toBeInTheDocument();
    });
  });

  it("shows running status when all members have processId", async () => {
    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("3/3 running")).toBeInTheDocument();
    });
  });

  it("shows partial status when some members have processId", async () => {
    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("1/3 running")).toBeInTheDocument();
    });
  });

  it("shows agent chips with member names", async () => {
    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("security-reviewer")).toBeInTheDocument();
      expect(screen.getByText("test-writer")).toBeInTheDocument();
    });
  });

  it("shows unread badge for teams with unread messages", async () => {
    renderApp(<CrewsListPage />);

    // my-feature: backend-dev has unreadCount: 2
    // code-review-team: security-reviewer has unreadCount: 1
    await waitFor(() => {
      expect(screen.getByText("2 unread")).toBeInTheDocument();
      expect(screen.getByText("1 unread")).toBeInTheDocument();
    });
  });

  it("shows start-all button only for non-fully-running crews", async () => {
    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("my-feature")).toBeInTheDocument();
    });

    // There should be exactly one "Start all" button (for my-feature, not for code-review-team)
    const startButtons = screen.getAllByText("Start all");
    expect(startButtons).toHaveLength(1);
  });

  it("shows empty state when no teams", async () => {
    server.use(http.get("/api/teams", () => HttpResponse.json([])));

    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("No crews deployed yet.")).toBeInTheDocument();
      expect(screen.getByText("Deploy a blueprint")).toBeInTheDocument();
    });
  });

  it("shows error banner on API error", async () => {
    server.use(
      http.get("/api/teams", () =>
        HttpResponse.json(
          { error: { kind: "internal_error", message: "Database connection failed" } },
          { status: 500 },
        ),
      ),
    );

    renderApp(<CrewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    });
  });

  it("navigates to crew detail on card click", async () => {
    const user = userEvent.setup();

    // Render with a LocationSpy to track navigation
    let currentPath = "/";
    function LocationSpy() {
      const [location] = useLocation();
      currentPath = location;
      return null;
    }

    renderApp(
      <>
        <LocationSpy />
        <CrewsListPage />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
    });

    const card = screen.getByText("code-review-team").closest("[class*='cursor-pointer']");
    expect(card).toBeTruthy();
    await user.click(card!);

    expect(currentPath).toBe("/crews/code-review-team");
  });
});
