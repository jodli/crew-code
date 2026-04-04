import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route } from "wouter";
import { renderApp } from "../test/render.tsx";
import { server } from "../test/setup.ts";
import { CrewDetailPage } from "./crew-detail.tsx";

function renderCrewDetail(teamName: string) {
  const user = userEvent.setup();
  const result = renderApp(
    <Route path="/crews/:name">
      <CrewDetailPage />
    </Route>,
    { route: `/crews/${teamName}` },
  );
  return { user, ...result };
}

describe("Crew Mutations", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Start/Stop Agent", () => {
    it("stop running agent sends POST and shows toast", async () => {
      let stopCalled = false;
      let stoppedAgent = "";
      server.use(
        http.post("/api/teams/:name/agents/:agent/stop", ({ params }) => {
          stopCalled = true;
          stoppedAgent = params.agent as string;
          return HttpResponse.json({ stopped: true });
        }),
      );

      const { user } = renderCrewDetail("code-review-team");

      // Wait for agents to load (all 3 running)
      await waitFor(() => {
        expect(screen.getByText("3/3 running")).toBeInTheDocument();
      });

      // Click on security-reviewer to select it
      await user.click(screen.getByText("security-reviewer"));

      // Wait for detail panel with Stop button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
      });

      // Click Stop
      await user.click(screen.getByRole("button", { name: "Stop" }));

      // POST was fired
      await waitFor(() => {
        expect(stopCalled).toBe(true);
      });
      expect(stoppedAgent).toBe("security-reviewer");

      // Success toast
      await waitFor(() => {
        expect(screen.getByText(/Stopped security-reviewer/)).toBeInTheDocument();
      });
    });

    it("start stopped agent sends POST and shows toast", async () => {
      let startCalled = false;
      let startedAgent = "";
      server.use(
        http.post("/api/teams/:name/agents/:agent/start", ({ params }) => {
          startCalled = true;
          startedAgent = params.agent as string;
          return HttpResponse.json({ started: true, pid: 50100, tmuxSession: "crew_my-feature" });
        }),
      );

      const { user } = renderCrewDetail("my-feature");

      // Wait for agents to load (1 running, 2 stopped)
      await waitFor(() => {
        expect(screen.getByText("1/3 running")).toBeInTheDocument();
      });

      // Click on backend-dev (stopped)
      await user.click(screen.getByText("backend-dev"));

      // Wait for detail panel with Start button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
      });

      // Click Start
      await user.click(screen.getByRole("button", { name: "Start" }));

      // POST was fired
      await waitFor(() => {
        expect(startCalled).toBe(true);
      });
      expect(startedAgent).toBe("backend-dev");

      // Success toast
      await waitFor(() => {
        expect(screen.getByText(/Started backend-dev/)).toBeInTheDocument();
      });
    });
  });

  describe("Start All", () => {
    it("start all sends POST and shows toast with count", async () => {
      let startAllCalled = false;
      server.use(
        http.post("/api/teams/:name/start", () => {
          startAllCalled = true;
          return HttpResponse.json({
            started: [
              { name: "backend-dev", pid: 50200 },
              { name: "frontend-dev", pid: 50201 },
            ],
            skipped: [{ name: "team-lead", reason: "already running" }],
            tmuxSession: "crew_my-feature",
          });
        }),
      );

      const { user } = renderCrewDetail("my-feature");

      // Wait for page to load — my-feature has stopped agents so "Start all" is visible
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Start all" })).toBeInTheDocument();
      });

      // Click Start all
      await user.click(screen.getByRole("button", { name: "Start all" }));

      // POST was fired
      await waitFor(() => {
        expect(startAllCalled).toBe(true);
      });

      // Toast shows started count
      await waitFor(() => {
        expect(screen.getByText(/Started 2 agents/)).toBeInTheDocument();
      });
    });
  });

  describe("Send Message", () => {
    it("sends message to selected agent", async () => {
      let sendCalled = false;
      let sentBody: { message?: string; from?: string } = {};
      server.use(
        http.post("/api/teams/:name/agents/:agent/inbox", async ({ request }) => {
          sendCalled = true;
          sentBody = (await request.json()) as typeof sentBody;
          return new HttpResponse(null, { status: 201 });
        }),
      );

      const { user } = renderCrewDetail("code-review-team");

      // Wait for agents to load
      await waitFor(() => {
        expect(screen.getByText("3/3 running")).toBeInTheDocument();
      });

      // Select an agent to open inbox
      await user.click(screen.getByText("security-reviewer"));

      // Wait for inbox to appear with send input
      const input = await screen.findByPlaceholderText("Message to security-reviewer...");

      // Type message
      await user.type(input, "Please review the auth module");

      // Click Send
      await user.click(screen.getByRole("button", { name: "Send" }));

      // POST was fired with correct body
      await waitFor(() => {
        expect(sendCalled).toBe(true);
      });
      expect(sentBody.message).toBe("Please review the auth module");
      expect(sentBody.from).toBe("crew");

      // Input is cleared
      await waitFor(() => {
        expect(input).toHaveValue("");
      });

      // Toast
      await waitFor(() => {
        expect(screen.getByText(/Sent to security-reviewer/)).toBeInTheDocument();
      });
    });

    it("empty message does not send", async () => {
      let sendCalled = false;
      server.use(
        http.post("/api/teams/:name/agents/:agent/inbox", async () => {
          sendCalled = true;
          return new HttpResponse(null, { status: 201 });
        }),
      );

      const { user } = renderCrewDetail("code-review-team");

      // Wait for agents
      await waitFor(() => {
        expect(screen.getByText("3/3 running")).toBeInTheDocument();
      });

      // Select agent
      await user.click(screen.getByText("security-reviewer"));

      // Wait for inbox
      const input = await screen.findByPlaceholderText("Message to security-reviewer...");

      // Press Enter with empty input
      await user.type(input, "{Enter}");

      // No API call
      expect(sendCalled).toBe(false);
    });
  });

  describe("Destroy Team", () => {
    it("destroy with confirmation sends DELETE and navigates", async () => {
      let deleteCalled = false;
      server.use(
        http.delete("/api/teams/:name", () => {
          deleteCalled = true;
          return HttpResponse.json({ name: "code-review-team" });
        }),
      );

      const { user, history } = renderCrewDetail("code-review-team");

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Click Destroy button
      await user.click(screen.getByRole("button", { name: "Destroy" }));

      // Text changes to "Confirm destroy?"
      expect(screen.getByRole("button", { name: "Confirm destroy?" })).toBeInTheDocument();

      // Click confirm
      await user.click(screen.getByRole("button", { name: "Confirm destroy?" }));

      // DELETE was fired
      await waitFor(() => {
        expect(deleteCalled).toBe(true);
      });

      // Toast
      await waitFor(() => {
        expect(screen.getByText("Team destroyed")).toBeInTheDocument();
      });

      // Navigated to /crews
      await waitFor(() => {
        expect(history.at(-1)).toBe("/crews");
      });
    });

    it("destroy confirmation resets after 3 seconds", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderApp(
        <Route path="/crews/:name">
          <CrewDetailPage />
        </Route>,
        { route: "/crews/code-review-team" },
      );

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Click Destroy
      await user.click(screen.getByRole("button", { name: "Destroy" }));
      expect(screen.getByRole("button", { name: "Confirm destroy?" })).toBeInTheDocument();

      // Advance by 3 seconds to trigger the confirmation reset timeout
      await vi.advanceTimersByTimeAsync(3000);

      // Button reverts back to "Destroy"
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Destroy" })).toBeInTheDocument();
      });
    });

    it("destroy error shows toast", async () => {
      server.use(
        http.delete("/api/teams/:name", () => {
          return HttpResponse.json(
            { error: { kind: "internal_error", message: "Something went wrong" } },
            { status: 500 },
          );
        }),
      );

      const { user, history } = renderCrewDetail("code-review-team");

      // Wait for page
      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Click Destroy then Confirm
      await user.click(screen.getByRole("button", { name: "Destroy" }));
      await user.click(screen.getByRole("button", { name: "Confirm destroy?" }));

      // Error toast
      await waitFor(() => {
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      });

      // Should stay on same page (not navigate away)
      expect(history.at(-1)).toBe("/crews/code-review-team");
    });
  });
});
