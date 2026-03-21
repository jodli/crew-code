import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { ProcessRegistry } from "../ports/process-registry.ts";
import type { BlueprintStore } from "../ports/blueprint-store.ts";
import type { AppContext } from "../types/context.ts";
import type { TeamConfig, AgentMember, InboxMessage } from "../types/domain.ts";
import { ok, err } from "../types/result.ts";

// ---------------------------------------------------------------------------
// Store factories — flat no-ops with per-method overrides
// ---------------------------------------------------------------------------

export function makeConfigStore(
  overrides: Partial<ConfigStore> = {},
): ConfigStore {
  return {
    getTeam: async () => err({ kind: "team_not_found", team: "" }),
    updateTeam: async () => err({ kind: "team_not_found", team: "" }),
    teamExists: async () => false,
    createTeam: async () => ok(undefined),
    listTeams: async () => ok([]),
    deleteTeam: async () => ok(undefined),
    ...overrides,
  };
}

export function makeInboxStore(
  overrides: Partial<InboxStore> = {},
): InboxStore {
  return {
    createInbox: async () => ok(undefined),
    readMessages: async () => ok([] as InboxMessage[]),
    appendMessage: async () => ok(undefined),
    listInboxes: async () => ok([] as string[]),
    deleteInbox: async () => ok(undefined),
    markAllRead: async () => ok(undefined),
    ...overrides,
  };
}

export function makeProcessRegistry(
  overrides: Partial<ProcessRegistry> = {},
): ProcessRegistry {
  return {
    activate: async () => ok(undefined),
    deactivate: async () => ok(undefined),
    isAlive: async () => false,
    kill: async () => ok(true),
    listActive: async () => ok([]),
    cleanup: async () => ok(undefined),
    ...overrides,
  };
}

export function makeBlueprintStore(
  overrides: Partial<BlueprintStore> = {},
): BlueprintStore {
  return {
    load: async (name) => err({ kind: "blueprint_not_found", name }),
    save: async () => ok("/fake/path.yaml"),
    list: async () => ok([]),
    exists: async () => false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

export function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  return {
    configStore: makeConfigStore(),
    inboxStore: makeInboxStore(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

export function makeMember(
  overrides: Partial<AgentMember> & { name: string },
): AgentMember {
  return {
    agentId: `${overrides.name}@test`,
    agentType: "general-purpose",
    joinedAt: 0,
    cwd: "/tmp",
    subscriptions: [],
    ...overrides,
  };
}

export function makeTeamConfig(
  overrides: Partial<TeamConfig> = {},
): TeamConfig {
  const name = overrides.name ?? "test-team";
  return {
    name,
    createdAt: 0,
    leadAgentId: `team-lead@${name}`,
    leadSessionId: "lead-session",
    members: [
      makeMember({ name: "team-lead", agentType: "team-lead" }),
    ],
    ...overrides,
  };
}
