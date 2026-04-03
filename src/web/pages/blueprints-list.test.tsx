import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../test/setup.ts";
import { renderApp } from "../test/render.tsx";
import { BlueprintsListPage } from "./blueprints-list.tsx";
import { FIXTURE_BLUEPRINTS } from "../test/msw-handlers.ts";

describe("BlueprintsListPage", () => {
  it("shows loading skeleton while fetching", () => {
    renderApp(<BlueprintsListPage />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders blueprint cards after loading", async () => {
    renderApp(<BlueprintsListPage />);
    for (const bp of FIXTURE_BLUEPRINTS) {
      await waitFor(() => {
        expect(screen.getByText(bp.name)).toBeInTheDocument();
      });
    }
  });

  it("shows agent chips with correct names", async () => {
    renderApp(<BlueprintsListPage />);
    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
    });
    // Check unique agent names from code-review-team: security-reviewer, test-writer
    expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    expect(screen.getByText("test-writer")).toBeInTheDocument();
    // team-lead appears in all 3 blueprints
    expect(screen.getAllByText("team-lead")).toHaveLength(3);
  });

  it("shows search input when more than 3 blueprints", async () => {
    const extraBlueprint = {
      name: "extra-team",
      description: "An extra blueprint for testing search",
      agents: [
        { name: "team-lead", agentType: "team-lead" as const, model: "opus", prompt: "Lead." },
      ],
    };
    server.use(
      http.get("/api/blueprints", () =>
        HttpResponse.json([...FIXTURE_BLUEPRINTS, extraBlueprint]),
      ),
    );

    const user = userEvent.setup();
    renderApp(<BlueprintsListPage />);

    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Filter blueprints...");
    expect(searchInput).toBeInTheDocument();

    await user.type(searchInput, "fullstack");

    expect(screen.getByText("fullstack-feature")).toBeInTheDocument();
    expect(screen.queryByText("code-review-team")).not.toBeInTheDocument();
    expect(screen.queryByText("docs-generator")).not.toBeInTheDocument();
    expect(screen.queryByText("extra-team")).not.toBeInTheDocument();
  });

  it("does not show search input with 3 or fewer blueprints", async () => {
    renderApp(<BlueprintsListPage />);
    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText("Filter blueprints...")).not.toBeInTheDocument();
  });

  it("shows empty state when API returns empty array", async () => {
    server.use(
      http.get("/api/blueprints", () => HttpResponse.json([])),
    );
    renderApp(<BlueprintsListPage />);

    await waitFor(() => {
      expect(screen.getByText("Create your first blueprint")).toBeInTheDocument();
    });
  });

  it("shows error banner on API error", async () => {
    server.use(
      http.get("/api/blueprints", () =>
        HttpResponse.json(
          { error: { kind: "internal_error", message: "Database connection failed" } },
          { status: 500 },
        ),
      ),
    );
    renderApp(<BlueprintsListPage />);

    await waitFor(() => {
      expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    });
  });

  it("displays correct template count", async () => {
    renderApp(<BlueprintsListPage />);
    await waitFor(() => {
      expect(screen.getByText("3 templates available")).toBeInTheDocument();
    });
  });

  it("navigates to editor on card click", async () => {
    const user = userEvent.setup();
    const { history } = renderApp(<BlueprintsListPage />);

    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
    });

    const card = screen.getByText("code-review-team").closest(".cursor-pointer");
    expect(card).toBeTruthy();
    await user.click(card!);

    expect(history).toContain("/blueprints/code-review-team");
  });
});
