import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
  FIXTURE_AGENT_INBOX,
  FIXTURE_AGENT_TYPES,
  FIXTURE_BLUEPRINTS,
  FIXTURE_CREW_MESSAGES,
  FIXTURE_MODELS,
  FIXTURE_TEAM_DETAILS,
  FIXTURE_TEAM_SUMMARIES,
} from "../test/msw-handlers.ts";
import { server } from "../test/setup.ts";
import {
  ApiError,
  createBlueprint,
  deleteBlueprint,
  destroyTeam,
  getAgentInbox,
  getAgentTypes,
  getBlueprint,
  getBlueprints,
  getCrewMessages,
  getModels,
  getTeam,
  getTeams,
  healthCheck,
  loadBlueprint,
  removeAgent,
  sendMessage,
  startAgent,
  startTeam,
  stopAgent,
  updateBlueprint,
} from "./api-client.ts";

describe("api-client", () => {
  // --- Blueprints ---

  describe("getBlueprints", () => {
    it("returns all blueprints", async () => {
      const result = await getBlueprints();
      expect(result).toEqual(FIXTURE_BLUEPRINTS);
    });
  });

  describe("getBlueprint", () => {
    it("returns a single blueprint by name", async () => {
      const result = await getBlueprint("code-review-team");
      expect(result).toEqual(FIXTURE_BLUEPRINTS[0]);
    });

    it("throws ApiError with 404 for unknown blueprint", async () => {
      try {
        await getBlueprint("nonexistent");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        const err = e as ApiError;
        expect(err.status).toBe(404);
        expect(err.kind).toBe("blueprint_not_found");
      }
    });
  });

  describe("createBlueprint", () => {
    it("creates a blueprint and returns name + path", async () => {
      const bp = { name: "new-team", agents: [{ name: "lead", agentType: "team-lead" }] };
      const result = await createBlueprint(bp);
      expect(result).toEqual({ name: "new-team", path: expect.stringContaining("new-team") });
    });
  });

  describe("updateBlueprint", () => {
    it("updates a blueprint and returns the updated version", async () => {
      const result = await updateBlueprint("code-review-team", { description: "Updated" });
      expect(result.name).toBe("code-review-team");
      expect(result.description).toBe("Updated");
    });
  });

  describe("deleteBlueprint", () => {
    it("deletes a blueprint and returns its name", async () => {
      const result = await deleteBlueprint("code-review-team");
      expect(result).toEqual({ name: "code-review-team" });
    });

    it("throws ApiError with 404 for unknown blueprint", async () => {
      try {
        await deleteBlueprint("nonexistent");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(404);
      }
    });
  });

  describe("loadBlueprint", () => {
    it("loads a blueprint into a team", async () => {
      const result = await loadBlueprint("code-review-team");
      expect(result.name).toBe("code-review-team");
      expect(result.members).toBeDefined();
      expect(result.members.length).toBeGreaterThan(0);
    });
  });

  // --- Meta ---

  describe("getAgentTypes", () => {
    it("returns agent type strings including general-purpose", async () => {
      const result = await getAgentTypes();
      expect(result).toEqual(FIXTURE_AGENT_TYPES);
      expect(result).toContain("general-purpose");
    });
  });

  describe("getModels", () => {
    it("returns model strings including sonnet", async () => {
      const result = await getModels();
      expect(result).toEqual(FIXTURE_MODELS);
      expect(result).toContain("sonnet");
    });
  });

  // --- Teams ---

  describe("getTeams", () => {
    it("returns team summaries", async () => {
      const result = await getTeams();
      expect(result).toEqual(FIXTURE_TEAM_SUMMARIES);
    });
  });

  describe("getTeam", () => {
    it("returns team detail with members", async () => {
      const result = await getTeam("code-review-team");
      expect(result).toEqual(FIXTURE_TEAM_DETAILS["code-review-team"]);
      expect(result.members.length).toBe(3);
    });

    it("throws ApiError with 404 for unknown team", async () => {
      try {
        await getTeam("nonexistent");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(404);
        expect((e as ApiError).kind).toBe("team_not_found");
      }
    });
  });

  describe("startTeam", () => {
    it("returns started agents", async () => {
      const result = await startTeam("code-review-team");
      expect(result.started).toBeDefined();
      expect(result.started.length).toBeGreaterThan(0);
      expect(result.started[0]).toHaveProperty("name");
      expect(result.started[0]).toHaveProperty("pid");
      expect(result.tmuxSession).toBe("crew_code-review-team");
    });
  });

  describe("destroyTeam", () => {
    it("destroys a team and returns its name", async () => {
      const result = await destroyTeam("code-review-team");
      expect(result).toEqual({ name: "code-review-team" });
    });
  });

  // --- Agents ---

  describe("startAgent", () => {
    it("returns started status with pid", async () => {
      const result = await startAgent("code-review-team", "security-reviewer");
      expect(result.started).toBe(true);
      expect(result.pid).toBeDefined();
      expect(result.tmuxSession).toBeDefined();
    });
  });

  describe("stopAgent", () => {
    it("returns stopped status", async () => {
      const result = await stopAgent("code-review-team", "security-reviewer");
      expect(result).toEqual({ stopped: true });
    });
  });

  describe("removeAgent", () => {
    it("returns void on success (204)", async () => {
      const result = await removeAgent("code-review-team", "security-reviewer");
      expect(result).toBeUndefined();
    });
  });

  // --- Messages ---

  describe("getAgentInbox", () => {
    it("returns inbox with messages", async () => {
      const result = await getAgentInbox("code-review-team", "security-reviewer");
      expect(result).toEqual(FIXTURE_AGENT_INBOX);
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe("sendMessage", () => {
    it("sends a message (201, no body)", async () => {
      const result = await sendMessage("code-review-team", "security-reviewer", "Hello");
      expect(result).toBeUndefined();
    });
  });

  describe("getCrewMessages", () => {
    it("returns crew channel messages", async () => {
      const result = await getCrewMessages("code-review-team");
      expect(result).toEqual(FIXTURE_CREW_MESSAGES);
    });
  });

  // --- Health ---

  describe("healthCheck", () => {
    it("returns health status", async () => {
      const result = await healthCheck();
      expect(result).toEqual({ status: "ok", version: "0.1.6", uptime: 12345 });
    });
  });

  // --- Error handling ---

  describe("server error", () => {
    it("throws ApiError with status 500 on server error", async () => {
      server.use(
        http.get("/api/blueprints", () =>
          HttpResponse.json({ error: { kind: "file_read_failed", message: "disk error" } }, { status: 500 }),
        ),
      );

      try {
        await getBlueprints();
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        const err = e as ApiError;
        expect(err.status).toBe(500);
        expect(err.kind).toBe("file_read_failed");
        expect(err.message).toBe("disk error");
      }
    });
  });
});
