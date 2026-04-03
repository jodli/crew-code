import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route } from "wouter";
import { server } from "../test/setup.ts";
import { renderApp } from "../test/render.tsx";
import { BlueprintEditorPage } from "./blueprint-editor.tsx";
import { FIXTURE_AGENT_TYPES, FIXTURE_MODELS } from "../test/msw-handlers.ts";

/**
 * Helper: render editor in create mode (/blueprints/new).
 * No Route wrapper needed — useParams() returns {} so isNew = true.
 */
function renderCreate() {
  const user = userEvent.setup();
  const result = renderApp(<BlueprintEditorPage />, { route: "/blueprints/new" });
  return { user, ...result };
}

/**
 * Helper: render editor in edit mode (/blueprints/:name).
 * Must wrap in <Route> so wouter parses the :name param.
 */
function renderEdit(name: string) {
  const user = userEvent.setup();
  const result = renderApp(
    <Route path="/blueprints/:name"><BlueprintEditorPage /></Route>,
    { route: `/blueprints/${name}` },
  );
  return { user, ...result };
}

describe("BlueprintEditorPage", () => {
  it("create mode: shows empty form at /blueprints/new", async () => {
    renderCreate();

    // Name input should be empty
    const nameInput = await screen.findByPlaceholderText("my-blueprint");
    expect(nameInput).toHaveValue("");

    // Breadcrumb shows "New"
    expect(screen.getByText("New")).toBeInTheDocument();

    // Default agent list has "team-lead" (appears multiple times: list, heading, type dropdown)
    expect(screen.getAllByText("team-lead").length).toBeGreaterThanOrEqual(1);
  });

  it("edit mode: loads blueprint data from API", async () => {
    renderEdit("code-review-team");

    // Wait for name input to have loaded value
    const nameInput = await screen.findByDisplayValue("code-review-team");
    expect(nameInput).toBeInTheDocument();

    // All 3 agents should be listed (use getAllByText since "team-lead" appears in multiple places)
    expect(screen.getAllByText("team-lead").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    expect(screen.getByText("test-writer")).toBeInTheDocument();
  });

  it("edit mode: shows error on 404", async () => {
    server.use(
      http.get("/api/blueprints/nonexistent", () =>
        HttpResponse.json(
          { error: { kind: "blueprint_not_found", message: "Blueprint 'nonexistent' not found" } },
          { status: 404 },
        ),
      ),
    );

    renderEdit("nonexistent");

    await waitFor(() => {
      expect(screen.getByText("Blueprint 'nonexistent' not found")).toBeInTheDocument();
    });
  });

  it("marks form dirty on field change", async () => {
    const { user } = renderCreate();

    // Initially no "unsaved" indicator
    expect(screen.queryByText("unsaved")).not.toBeInTheDocument();

    // Type in description field
    const descInput = await screen.findByPlaceholderText("Optional");
    await user.type(descInput, "some description");

    // "unsaved" indicator should now be visible
    expect(screen.getByText("unsaved")).toBeInTheDocument();
  });

  it("adds agent to list", async () => {
    const { user } = renderCreate();

    // Wait for initial agent to render
    await screen.findByPlaceholderText("my-blueprint");

    // Click "+ Add" button
    await user.click(screen.getByText("+ Add"));

    // Now there should be 2 agents — the new one "agent-1" appears in the list
    // (it also appears in the h2 heading, so use getAllByText)
    expect(screen.getAllByText("agent-1").length).toBeGreaterThanOrEqual(1);
  });

  it("removes agent from list", async () => {
    const { user } = renderEdit("code-review-team");

    // Wait for agents to load
    await screen.findByText("security-reviewer");

    // There should be 3 agents now
    expect(screen.getByText("security-reviewer")).toBeInTheDocument();
    expect(screen.getByText("test-writer")).toBeInTheDocument();

    // Find all remove buttons (✕). With 3 agents, there should be 3.
    const removeButtons = screen.getAllByText("\u2715");
    expect(removeButtons.length).toBe(3);

    // Click a remove button to remove an agent
    await user.click(removeButtons[1]);

    // Should now have 2 remove buttons
    await waitFor(() => {
      expect(screen.getAllByText("\u2715").length).toBe(2);
    });
  });

  it("loads agent types from API", async () => {
    renderCreate();

    // Wait for agent types to load from API.
    // The Type select is inside a Field component. We find it via its label text
    // then get the sibling select element.
    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      // First select is Type, second is Model
      const typeSelect = selects[0] as HTMLSelectElement;
      const typeOptions = [...typeSelect.options].map((o) => o.value);
      for (const agentType of FIXTURE_AGENT_TYPES) {
        expect(typeOptions).toContain(agentType);
      }
    });
  });

  it("loads models from API", async () => {
    renderCreate();

    await waitFor(() => {
      const selects = screen.getAllByRole("combobox");
      // Second select is Model
      const modelSelect = selects[1] as HTMLSelectElement;
      const modelOptions = [...modelSelect.options].map((o) => o.value);
      for (const model of FIXTURE_MODELS) {
        expect(modelOptions).toContain(model);
      }
    });
  });

  it("save in create mode: POST request", async () => {
    const { user } = renderCreate();

    // Fill name field
    const nameInput = await screen.findByPlaceholderText("my-blueprint");
    await user.type(nameInput, "test-blueprint");

    // Click Save
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Wait for success toast
    await waitFor(() => {
      expect(screen.getByText(/Saved "test-blueprint"/)).toBeInTheDocument();
    });
  });

  it("save in edit mode: PATCH request", async () => {
    const { user } = renderEdit("code-review-team");

    // Wait for data to load
    await screen.findByDisplayValue("code-review-team");

    // Change description
    const descInput = screen.getByPlaceholderText("Optional");
    await user.clear(descInput);
    await user.type(descInput, "Updated description");

    // Click Save
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Wait for success toast
    await waitFor(() => {
      expect(screen.getByText(/Saved "code-review-team"/)).toBeInTheDocument();
    });
  });

  it("validation: empty name shows error", async () => {
    let postCalled = false;
    server.use(
      http.post("/api/blueprints", async () => {
        postCalled = true;
        return HttpResponse.json({ name: "x", path: "x" }, { status: 201 });
      }),
    );

    const { user } = renderCreate();

    // Name is already empty. Click Save.
    await screen.findByPlaceholderText("my-blueprint");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // Error should appear (both inline validation and toast show the message)
    const errors = await screen.findAllByText("Blueprint name is required");
    expect(errors.length).toBeGreaterThanOrEqual(1);

    // No API call should have been made
    expect(postCalled).toBe(false);
  });

  it("YAML toggle: form to YAML and back", async () => {
    const { user } = renderCreate();

    // Set a name first
    const nameInput = await screen.findByPlaceholderText("my-blueprint");
    await user.type(nameInput, "test");

    // Click "YAML" button to switch
    await user.click(screen.getByRole("button", { name: "YAML" }));

    // YAML textarea should appear with "test" in the content
    const yamlTextarea = screen.getByRole("textbox");
    expect((yamlTextarea as HTMLTextAreaElement).value).toContain("test");

    // Click "Form" button to switch back
    await user.click(screen.getByRole("button", { name: "Form" }));

    // Form mode returns, name should still be "test"
    await waitFor(() => {
      const input = screen.getByPlaceholderText("my-blueprint") as HTMLInputElement;
      expect(input.value).toBe("test");
    });
  });

  it("YAML parse error: shows inline error", async () => {
    const { user } = renderCreate();

    await screen.findByPlaceholderText("my-blueprint");

    // Switch to YAML mode
    await user.click(screen.getByRole("button", { name: "YAML" }));

    // Clear and type invalid YAML
    const yamlTextarea = screen.getByRole("textbox");
    await user.clear(yamlTextarea);
    await user.type(yamlTextarea, "{{{{");

    // Click "Form" button to try to switch back
    await user.click(screen.getByRole("button", { name: "Form" }));

    // Error message should be shown
    await waitFor(() => {
      expect(screen.getByText(/parse error|needs name/i)).toBeInTheDocument();
    });

    // Should still be in YAML mode (textarea still visible)
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
