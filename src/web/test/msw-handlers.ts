import type { Blueprint } from "@crew/config/blueprint-schema.ts";
import type { CrewChannelResult } from "@crew/core/crew-channel.ts";
import type { InboxResult } from "@crew/core/inbox.ts";
import type { MemberDetail, TeamDetail, TeamSummary } from "@crew/core/status.ts";
import type { InboxMessage } from "@crew/types/domain.ts";
import { HttpResponse, http } from "msw";

// --- Fixture data (real API response shapes) ---

export const FIXTURE_BLUEPRINTS: Blueprint[] = [
  {
    name: "code-review-team",
    description: "Automated code review squad with specialized reviewers",
    agents: [
      { name: "team-lead", agentType: "team-lead", model: "opus", prompt: "You coordinate the code review team." },
      {
        name: "security-reviewer",
        agentType: "general-purpose",
        model: "sonnet",
        color: "#f7768e",
        prompt: "You are a security-focused code reviewer.",
      },
      {
        name: "test-writer",
        agentType: "general-purpose",
        model: "haiku",
        color: "#9ece6a",
        prompt: "You write tests for the reviewed code.",
      },
    ],
  },
  {
    name: "fullstack-feature",
    description: "Full-stack feature development team",
    agents: [
      { name: "team-lead", agentType: "team-lead", model: "opus", prompt: "Break down features into tasks." },
      {
        name: "backend-dev",
        agentType: "general-purpose",
        model: "sonnet",
        color: "#7aa2f7",
        cwd: "~/repos/api",
        prompt: "You implement backend features.",
      },
    ],
  },
  {
    name: "docs-generator",
    description: "Documentation generation and maintenance",
    agents: [
      { name: "team-lead", agentType: "team-lead", model: "sonnet", prompt: "Coordinate documentation tasks." },
      {
        name: "api-docs",
        agentType: "general-purpose",
        model: "haiku",
        color: "#7dcfff",
        prompt: "Generate API documentation.",
      },
    ],
  },
];

export const FIXTURE_AGENT_TYPES: string[] = [
  "general-purpose",
  "team-lead",
  "code-simplifier",
  "test-runner",
  "codebase-analyzer",
  "web-search-researcher",
];

export const FIXTURE_MODELS: string[] = [
  "(default)",
  "sonnet",
  "opus",
  "haiku",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-opus-4-6[1m]",
  "claude-sonnet-4-6[1m]",
  "claude-haiku-4-5-20251001",
];

export const FIXTURE_TEAM_SUMMARIES: TeamSummary[] = [
  { name: "code-review-team", description: "Automated code review squad", memberCount: 3 },
  { name: "my-feature", description: "Feature work on auth module", memberCount: 3 },
];

const FIXTURE_MEMBERS_REVIEW: MemberDetail[] = [
  {
    name: "team-lead",
    agentId: "team-lead@code-review-team",
    agentType: "team-lead",
    model: "opus",
    cwd: "~/repos/project",
    processId: 48201,
    unreadCount: 0,
  },
  {
    name: "security-reviewer",
    agentId: "security-reviewer@code-review-team",
    agentType: "general-purpose",
    model: "sonnet",
    color: "#f7768e",
    cwd: "~/repos/project",
    processId: 48202,
    unreadCount: 1,
  },
  {
    name: "test-writer",
    agentId: "test-writer@code-review-team",
    agentType: "general-purpose",
    model: "haiku",
    color: "#9ece6a",
    cwd: "~/repos/project",
    processId: 48203,
    unreadCount: 0,
  },
];

const FIXTURE_MEMBERS_FEATURE: MemberDetail[] = [
  {
    name: "team-lead",
    agentId: "team-lead@my-feature",
    agentType: "team-lead",
    model: "opus",
    cwd: "~/repos/app",
    processId: 49001,
    unreadCount: 0,
  },
  {
    name: "backend-dev",
    agentId: "backend-dev@my-feature",
    agentType: "general-purpose",
    model: "sonnet",
    color: "#7aa2f7",
    cwd: "~/repos/api",
    unreadCount: 2,
  },
  {
    name: "frontend-dev",
    agentId: "frontend-dev@my-feature",
    agentType: "general-purpose",
    model: "sonnet",
    color: "#bb9af7",
    cwd: "~/repos/web",
    unreadCount: 0,
  },
];

export const FIXTURE_TEAM_DETAILS: Record<string, TeamDetail> = {
  "code-review-team": {
    name: "code-review-team",
    description: "Automated code review squad",
    members: FIXTURE_MEMBERS_REVIEW,
  },
  "my-feature": { name: "my-feature", description: "Feature work on auth module", members: FIXTURE_MEMBERS_FEATURE },
};

const now = Date.now();
const min = (m: number) => new Date(now - m * 60_000).toISOString();

const FIXTURE_MESSAGES: InboxMessage[] = [
  { from: "team-lead", text: "Starting review of PR #247.", timestamp: min(12), read: true },
  {
    from: "security-reviewer",
    text: "Found 2 potential XSS vulnerabilities.",
    timestamp: min(10),
    color: "#f7768e",
    read: true,
  },
  { from: "test-writer", text: "Generated 12 test cases.", timestamp: min(6), color: "#9ece6a", read: false },
];

export const FIXTURE_CREW_MESSAGES: CrewChannelResult = {
  team: "code-review-team",
  messages: FIXTURE_MESSAGES,
  totalCount: 3,
  unreadCount: 1,
};

export const FIXTURE_AGENT_INBOX: InboxResult = {
  team: "code-review-team",
  agent: "security-reviewer",
  messages: [
    { from: "crew", text: "Review the auth module for security vulnerabilities.", timestamp: min(15), read: true },
    { from: "team-lead", text: "Also check the session handling logic.", timestamp: min(8), read: false },
  ],
  totalCount: 2,
  unreadCount: 1,
};

// --- MSW Handlers ---

export const handlers = [
  // Health
  http.get("/api/health", () => HttpResponse.json({ status: "ok", version: "0.1.6", uptime: 12345 })),

  // Blueprints
  http.get("/api/blueprints", () => HttpResponse.json(FIXTURE_BLUEPRINTS)),

  http.get("/api/blueprints/:name", ({ params }) => {
    const bp = FIXTURE_BLUEPRINTS.find((b) => b.name === params.name);
    if (!bp)
      return HttpResponse.json(
        { error: { kind: "blueprint_not_found", message: `Blueprint '${params.name}' not found` } },
        { status: 404 },
      );
    return HttpResponse.json(bp);
  }),

  http.post("/api/blueprints", async ({ request }) => {
    const body = (await request.json()) as Blueprint;
    return HttpResponse.json({ name: body.name, path: `~/.config/crew/blueprints/${body.name}.yaml` }, { status: 201 });
  }),

  http.patch("/api/blueprints/:name", async ({ params, request }) => {
    const bp = FIXTURE_BLUEPRINTS.find((b) => b.name === params.name);
    if (!bp)
      return HttpResponse.json(
        { error: { kind: "blueprint_not_found", message: `Blueprint '${params.name}' not found` } },
        { status: 404 },
      );
    const updates = (await request.json()) as Partial<Blueprint>;
    return HttpResponse.json({ ...bp, ...updates });
  }),

  http.delete("/api/blueprints/:name", ({ params }) => {
    const bp = FIXTURE_BLUEPRINTS.find((b) => b.name === params.name);
    if (!bp)
      return HttpResponse.json(
        { error: { kind: "blueprint_not_found", message: `Blueprint '${params.name}' not found` } },
        { status: 404 },
      );
    return HttpResponse.json({ name: params.name });
  }),

  http.post("/api/blueprints/:name/load", ({ params }) => {
    const bp = FIXTURE_BLUEPRINTS.find((b) => b.name === params.name);
    if (!bp)
      return HttpResponse.json(
        { error: { kind: "blueprint_not_found", message: `Blueprint '${params.name}' not found` } },
        { status: 404 },
      );
    const detail: TeamDetail = {
      name: bp.name,
      members: bp.agents.map((a) => ({
        name: a.name,
        agentId: `${a.name}@${bp.name}`,
        agentType: a.agentType ?? "general-purpose",
        model: a.model,
        color: a.color,
        cwd: a.cwd ?? ".",
        unreadCount: 0,
      })),
    };
    return HttpResponse.json(detail, { status: 201 });
  }),

  // Meta
  http.get("/api/agent-types", () => HttpResponse.json(FIXTURE_AGENT_TYPES)),

  http.get("/api/models", () => HttpResponse.json(FIXTURE_MODELS)),

  // Teams
  http.get("/api/teams", () => HttpResponse.json(FIXTURE_TEAM_SUMMARIES)),

  http.get("/api/teams/:name", ({ params }) => {
    const detail = FIXTURE_TEAM_DETAILS[params.name as string];
    if (!detail)
      return HttpResponse.json(
        { error: { kind: "team_not_found", message: `Team '${params.name}' not found` } },
        { status: 404 },
      );
    return HttpResponse.json(detail);
  }),

  http.post("/api/teams/:name/start", ({ params }) => {
    const detail = FIXTURE_TEAM_DETAILS[params.name as string];
    if (!detail)
      return HttpResponse.json(
        { error: { kind: "team_not_found", message: `Team '${params.name}' not found` } },
        { status: 404 },
      );
    return HttpResponse.json({
      started: detail.members.map((m) => ({ name: m.name, pid: 50000 + Math.floor(Math.random() * 1000) })),
      skipped: [],
      tmuxSession: `crew_${params.name}`,
    });
  }),

  http.delete("/api/teams/:name", ({ params }) => {
    const detail = FIXTURE_TEAM_DETAILS[params.name as string];
    if (!detail)
      return HttpResponse.json(
        { error: { kind: "team_not_found", message: `Team '${params.name}' not found` } },
        { status: 404 },
      );
    return HttpResponse.json({ name: params.name });
  }),

  // Agents
  http.get("/api/teams/:name/agents", ({ params }) => {
    const detail = FIXTURE_TEAM_DETAILS[params.name as string];
    if (!detail)
      return HttpResponse.json(
        { error: { kind: "team_not_found", message: `Team '${params.name}' not found` } },
        { status: 404 },
      );
    return HttpResponse.json(detail.members);
  }),

  http.post("/api/teams/:name/agents/:agent/start", ({ params }) =>
    HttpResponse.json({ started: true, pid: 50100, tmuxSession: `crew_${params.name}` }),
  ),

  http.post("/api/teams/:name/agents/:agent/stop", () => HttpResponse.json({ stopped: true })),

  http.delete("/api/teams/:name/agents/:agent", () => new HttpResponse(null, { status: 204 })),

  // Messages
  http.get("/api/teams/:name/agents/:agent/inbox", () => HttpResponse.json(FIXTURE_AGENT_INBOX)),

  http.post("/api/teams/:name/agents/:agent/inbox", () => new HttpResponse(null, { status: 201 })),

  http.get("/api/teams/:name/messages", () => HttpResponse.json(FIXTURE_CREW_MESSAGES)),
];
