import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Route } from "wouter";
import { FIXTURE_TEAM_DETAILS } from "../test/msw-handlers.ts";
import { renderApp } from "../test/render.tsx";
import { CrewDetailPage } from "./crew-detail.tsx";

function renderCrewDetail(teamName: string) {
  return renderApp(
    <Route path="/crews/:name">
      <CrewDetailPage />
    </Route>,
    { route: `/crews/${teamName}` },
  );
}

describe("CrewDetailPage", () => {
  it("shows loading state while fetching team", () => {
    renderCrewDetail("code-review-team");
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders agent list with member details", async () => {
    renderCrewDetail("code-review-team");

    const detail = FIXTURE_TEAM_DETAILS["code-review-team"];
    for (const member of detail.members) {
      await waitFor(() => {
        // Some member names also appear as message senders in crew channel,
        // so use getAllByText and check at least one is in the agent list
        const elements = screen.getAllByText(member.name);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    }

    // Check model and agentType are visible in the agent list area
    await waitFor(() => {
      expect(screen.getByText(/opus/)).toBeInTheDocument();
    });
  });

  it("shows running status for agents with processId", async () => {
    renderCrewDetail("code-review-team");

    // code-review-team: all 3 members have processId
    await waitFor(() => {
      const runningLabels = screen.getAllByText("running");
      expect(runningLabels.length).toBeGreaterThanOrEqual(3);
    });

    // Status badge shows "3/3 running"
    await waitFor(() => {
      expect(screen.getByText("3/3 running")).toBeInTheDocument();
    });
  });

  it("shows stopped status for agents without processId", async () => {
    renderCrewDetail("my-feature");

    // my-feature: backend-dev and frontend-dev have no processId
    await waitFor(() => {
      const stoppedLabels = screen.getAllByText("stopped");
      expect(stoppedLabels.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("shows 404 error for nonexistent team", async () => {
    renderCrewDetail("nonexistent");

    await waitFor(() => {
      expect(screen.getByText("Crew not found")).toBeInTheDocument();
    });
    // The API error message is also displayed
    expect(screen.getByText(/Team 'nonexistent' not found/)).toBeInTheDocument();
  });

  it("loads and displays crew channel messages", async () => {
    renderCrewDetail("code-review-team");

    // Wait for crew messages to load
    await waitFor(() => {
      expect(screen.getByText("Starting review of PR #247.")).toBeInTheDocument();
    });

    // Check other messages are visible
    expect(screen.getByText(/Found 2 potential XSS vulnerabilities/)).toBeInTheDocument();
    expect(screen.getByText(/Generated 12 test cases/)).toBeInTheDocument();
  });

  it("shows unread separator in channel", async () => {
    renderCrewDetail("code-review-team");

    // FIXTURE_CREW_MESSAGES has the third message with read: false
    await waitFor(() => {
      expect(screen.getByText("Starting review of PR #247.")).toBeInTheDocument();
    });

    // The unread separator should be present ("new" label)
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("channel shows read-only footer", async () => {
    renderCrewDetail("code-review-team");

    // Wait for the page to render with API data
    await waitFor(() => {
      expect(screen.getByText("code-review-team")).toBeInTheDocument();
    });

    // The footer contains "read-only" as part of "read-only — agents post here"
    // The &mdash; renders as an em dash. Use a specific class to target the footer div.
    const footer = document.querySelector(".text-text-muted\\/40.italic");
    expect(footer).toBeInTheDocument();
    expect(footer?.textContent).toContain("read-only");
  });

  it("selects agent and shows inbox", async () => {
    const user = userEvent.setup();
    renderCrewDetail("code-review-team");

    // Wait for team to load
    await waitFor(() => {
      expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    });

    // Click on security-reviewer
    await user.click(screen.getByText("security-reviewer"));

    // Inbox panel appears with agent name in inbox header
    await waitFor(() => {
      expect(screen.getByText("inbox")).toBeInTheDocument();
    });

    // Inbox messages from FIXTURE_AGENT_INBOX loaded
    await waitFor(() => {
      expect(screen.getByText("Review the auth module for security vulnerabilities.")).toBeInTheDocument();
      expect(screen.getByText("Also check the session handling logic.")).toBeInTheDocument();
    });
  });

  it("inbox shows agent color styling", async () => {
    const user = userEvent.setup();
    renderCrewDetail("code-review-team");

    await waitFor(() => {
      expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    });

    await user.click(screen.getByText("security-reviewer"));

    // The inbox has a top-border or color dot using the agent's color #f7768e
    await waitFor(() => {
      expect(screen.getByText("inbox")).toBeInTheDocument();
    });

    // The inbox container has a border-top with the agent color
    const inboxContainer = screen.getByText("inbox").closest("[style]");
    // A color dot element with the agent's color should be visible
    const colorDots = document.querySelectorAll(
      `[style*="background-color: #f7768e"], [style*="background-color: rgb(247, 118, 142)"]`,
    );
    expect(colorDots.length).toBeGreaterThan(0);
  });

  it("shows agent detail panel when selected", async () => {
    const user = userEvent.setup();
    renderCrewDetail("code-review-team");

    await waitFor(() => {
      expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    });

    await user.click(screen.getByText("security-reviewer"));

    // Detail panel shows:
    // Status with PID
    await waitFor(() => {
      expect(screen.getByText(/PID 48202/)).toBeInTheDocument();
    });

    // Model
    expect(screen.getByText("sonnet")).toBeInTheDocument();

    // CWD
    expect(screen.getByText("~/repos/project")).toBeInTheDocument();
  });

  it("renders markdown headings in crew channel messages", async () => {
    renderCrewDetail("code-review-team");

    // The fixture includes a markdown message with "# Review Summary"
    await waitFor(() => {
      const heading = document.querySelector("h1");
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toBe("Review Summary");
    });
  });

  it("renders markdown formatting in agent inbox", async () => {
    const user = userEvent.setup();
    renderCrewDetail("code-review-team");

    await waitFor(() => {
      expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    });

    await user.click(screen.getByText("security-reviewer"));

    // Wait for inbox markdown message to render — find heading unique to inbox fixture
    await waitFor(() => {
      expect(screen.getByText("Auth Review")).toBeInTheDocument();
    });

    // Bold text renders as <strong>
    const strong = screen.getByText((_, el) => el?.tagName === "STRONG" && el?.textContent === "Found 3 issues:");
    expect(strong).toBeInTheDocument();

    // Ordered list items render as <li>
    expect(screen.getByText(/SQL injection/)).toBeInTheDocument();
    expect(screen.getByText(/Missing rate limiting/)).toBeInTheDocument();

    // Code renders as <code>
    const codeEls = screen.getAllByText(/await hash/);
    const hasCodeEl = codeEls.some((el) => el.closest("code") || el.tagName === "CODE");
    expect(hasCodeEl).toBe(true);
  });

  it("close inbox button works", async () => {
    const user = userEvent.setup();
    renderCrewDetail("code-review-team");

    await waitFor(() => {
      expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    });

    // Open inbox
    await user.click(screen.getByText("security-reviewer"));

    await waitFor(() => {
      expect(screen.getByText("inbox")).toBeInTheDocument();
    });

    // Click close button
    const closeButton = screen.getByTitle("Close inbox");
    await user.click(closeButton);

    // Inbox panel disappears
    await waitFor(() => {
      expect(screen.queryByText("Review the auth module for security vulnerabilities.")).not.toBeInTheDocument();
    });
  });
});
