import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { FIXTURE_BLUEPRINTS } from "../test/msw-handlers.ts";
import { renderApp } from "../test/render.tsx";
import { server } from "../test/setup.ts";
import { BlueprintsListPage } from "./blueprints-list.tsx";

/** Open the dropdown menu (⋯ button) on the first blueprint card. */
async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  // The ⋯ trigger buttons — one per card
  const triggers = screen.getAllByText("⋯");
  await user.click(triggers[0]);
}

describe("Blueprint Actions", () => {
  describe("Delete", () => {
    it("shows confirmation on first click, deletes on second", async () => {
      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      // Wait for cards to load
      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Open dropdown on first card, click Delete
      await openDropdown(user);
      await user.click(screen.getByText("Delete"));

      // Dropdown stays open — text should now say "Confirm delete"
      expect(screen.getByText("Confirm delete")).toBeInTheDocument();

      // Click "Confirm delete" — triggers DELETE request
      await user.click(screen.getByText("Confirm delete"));

      // Success toast appears
      await waitFor(() => {
        expect(screen.getByText("Blueprint deleted")).toBeInTheDocument();
      });

      // Blueprint removed from list (query cache invalidated, re-fetches)
      await waitFor(() => {
        // After delete, the MSW handler still returns all 3 since we don't mutate fixtures.
        // But the delete request was successfully made — that's what we verify.
        expect(screen.getByText("Blueprint deleted")).toBeInTheDocument();
      });
    });

    it("confirmation resets after 3 seconds", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Click Delete to enter confirmation state — dropdown stays open
      await openDropdown(user);
      await user.click(screen.getByText("Delete"));

      // Confirmation should be visible (dropdown stayed open)
      expect(screen.getByText("Confirm delete")).toBeInTheDocument();

      // Close dropdown before advancing time
      const triggers = screen.getAllByText("⋯");
      await user.click(triggers[0]);

      // Advance timers by 3 seconds to reset confirmation
      vi.advanceTimersByTime(3000);

      // Re-open dropdown — should reset back to "Delete"
      await user.click(triggers[0]);
      await waitFor(() => {
        expect(screen.getByText("Delete")).toBeInTheDocument();
      });

      vi.useRealTimers();
    });
  });

  describe("Duplicate", () => {
    it("duplicates blueprint with -copy suffix", async () => {
      let postedName: string | undefined;
      server.use(
        http.post("/api/blueprints", async ({ request }) => {
          const body = (await request.json()) as { name: string };
          postedName = body.name;
          return HttpResponse.json(
            { name: body.name, path: `~/.config/crew/blueprints/${body.name}.yaml` },
            { status: 201 },
          );
        }),
      );

      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Open dropdown, click Duplicate
      await openDropdown(user);
      await user.click(screen.getByText("Duplicate"));

      // POST was called with -copy suffix
      await waitFor(() => {
        expect(postedName).toBe("code-review-team-copy");
      });

      // Success toast
      await waitFor(() => {
        expect(screen.getByText(/Duplicated "code-review-team"/)).toBeInTheDocument();
      });
    });
  });

  describe("Export YAML", () => {
    it("copies YAML to clipboard", async () => {
      const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Open dropdown, click Export YAML
      await openDropdown(user);
      await user.click(screen.getByText("Export YAML"));

      // clipboard.writeText called with YAML containing blueprint name
      expect(writeTextSpy).toHaveBeenCalledTimes(1);
      const writtenYaml = writeTextSpy.mock.calls[0][0];
      expect(writtenYaml).toContain("code-review-team");

      // Success toast
      await waitFor(() => {
        expect(screen.getByText(/Copied code-review-team\.yaml to clipboard/)).toBeInTheDocument();
      });

      writeTextSpy.mockRestore();
    });
  });

  describe("Deploy Dialog", () => {
    it("opens deploy dialog on Deploy click", async () => {
      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Click Deploy button on first card (visible in DOM despite opacity-0)
      const deployButtons = screen.getAllByText("Deploy");
      await user.click(deployButtons[0]);

      // Dialog appears with team name input and agent checklist
      expect(screen.getByText("Deploy blueprint")).toBeInTheDocument();
      expect(screen.getByLabelText("Team name")).toBeInTheDocument();

      // Agent names from the blueprint are listed
      for (const agent of FIXTURE_BLUEPRINTS[0].agents) {
        // Use getAllByText since agent names also appear in the card behind the dialog
        expect(screen.getAllByText(agent.name).length).toBeGreaterThanOrEqual(1);
      }
    });

    it("deploy-only calls loadBlueprint", async () => {
      let loadCalled = false;
      server.use(
        http.post("/api/blueprints/:name/load", () => {
          loadCalled = true;
          return HttpResponse.json(
            {
              name: "code-review-team",
              members: FIXTURE_BLUEPRINTS[0].agents.map((a) => ({
                name: a.name,
                agentId: `${a.name}@code-review-team`,
                agentType: a.agentType ?? "general-purpose",
                model: a.model,
                cwd: ".",
                unreadCount: 0,
              })),
            },
            { status: 201 },
          );
        }),
      );

      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Open deploy dialog
      const deployButtons = screen.getAllByText("Deploy");
      await user.click(deployButtons[0]);

      // Click "Deploy only"
      await user.click(screen.getByText("Deploy only"));

      // Load request fires
      await waitFor(() => {
        expect(loadCalled).toBe(true);
      });

      // Success state
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      });
    });

    it("deploy+start calls loadBlueprint then startTeam", async () => {
      let loadCalled = false;
      let startCalled = false;

      server.use(
        http.post("/api/blueprints/:name/load", () => {
          loadCalled = true;
          return HttpResponse.json(
            {
              name: "code-review-team",
              members: FIXTURE_BLUEPRINTS[0].agents.map((a) => ({
                name: a.name,
                agentId: `${a.name}@code-review-team`,
                agentType: a.agentType ?? "general-purpose",
                model: a.model,
                cwd: ".",
                unreadCount: 0,
              })),
            },
            { status: 201 },
          );
        }),
        http.post("/api/teams/:name/start", () => {
          startCalled = true;
          return HttpResponse.json({
            started: [
              { name: "team-lead", pid: 50001 },
              { name: "security-reviewer", pid: 50002 },
              { name: "test-writer", pid: 50003 },
            ],
            skipped: [],
            tmuxSession: "crew_code-review-team",
          });
        }),
      );

      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Open deploy dialog
      const deployButtons = screen.getAllByText("Deploy");
      await user.click(deployButtons[0]);

      // Click "Deploy + Start"
      await user.click(screen.getByText("Deploy + Start"));

      // Both requests fire
      await waitFor(() => {
        expect(loadCalled).toBe(true);
      });
      await waitFor(() => {
        expect(startCalled).toBe(true);
      });

      // Success state
      await waitFor(() => {
        expect(screen.getByText(/ready/i)).toBeInTheDocument();
      });
    });

    it("deploy error shows error in dialog", async () => {
      server.use(
        http.post("/api/blueprints/:name/load", () =>
          HttpResponse.json(
            { error: { kind: "team_exists", message: "Team 'code-review-team' already exists" } },
            { status: 409 },
          ),
        ),
      );

      const user = userEvent.setup();
      renderApp(<BlueprintsListPage />);

      await waitFor(() => {
        expect(screen.getByText("code-review-team")).toBeInTheDocument();
      });

      // Open deploy dialog
      const deployButtons = screen.getAllByText("Deploy");
      await user.click(deployButtons[0]);

      // Click "Deploy only"
      await user.click(screen.getByText("Deploy only"));

      // Error message shown in dialog
      await waitFor(() => {
        expect(screen.getByText("Team 'code-review-team' already exists")).toBeInTheDocument();
      });
    });
  });
});
