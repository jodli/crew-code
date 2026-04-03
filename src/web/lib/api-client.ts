export type { Blueprint, BlueprintAgent } from "@crew/config/blueprint-schema.ts";
export type { TeamSummary, MemberDetail, TeamDetail } from "@crew/core/status.ts";
export type { InboxResult } from "@crew/core/inbox.ts";
export type { CrewChannelResult } from "@crew/core/crew-channel.ts";
export type { InboxMessage } from "@crew/types/domain.ts";

// --- Types defined locally (not exported from backend) ---

export interface StartTeamResult {
  started: { name: string; pid: number }[];
  skipped: { name: string; reason: string }[];
  tmuxSession: string;
}

export interface StartAgentResult {
  started: boolean;
  pid: number;
  tmuxSession: string;
}

export interface HealthCheckResult {
  status: string;
  version: string;
  uptime: number;
}

// --- Error ---

export class ApiError extends Error {
  constructor(
    public readonly kind: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// --- Base fetch helper ---

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let kind = "unknown";
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) {
        kind = body.error.kind ?? kind;
        message = body.error.message ?? message;
      }
    } catch {
      // ignore parse errors, use defaults
    }
    throw new ApiError(kind, message, res.status);
  }

  if (res.status === 204 || res.status === 201) {
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text);
  }

  return res.json();
}

// --- Blueprints ---

export async function getBlueprints() {
  return apiFetch<import("@crew/config/blueprint-schema.ts").Blueprint[]>("/blueprints");
}

export async function getBlueprint(name: string) {
  return apiFetch<import("@crew/config/blueprint-schema.ts").Blueprint>(`/blueprints/${encodeURIComponent(name)}`);
}

export async function createBlueprint(data: import("@crew/config/blueprint-schema.ts").Blueprint) {
  return apiFetch<{ name: string; path: string }>("/blueprints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBlueprint(name: string, data: { description?: string; agents?: import("@crew/config/blueprint-schema.ts").BlueprintAgent[] }) {
  return apiFetch<import("@crew/config/blueprint-schema.ts").Blueprint>(`/blueprints/${encodeURIComponent(name)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteBlueprint(name: string) {
  return apiFetch<{ name: string }>(`/blueprints/${encodeURIComponent(name)}`, { method: "DELETE" });
}

export async function loadBlueprint(name: string, opts?: { teamName?: string }) {
  return apiFetch<import("@crew/core/status.ts").TeamDetail>(`/blueprints/${encodeURIComponent(name)}/load`, {
    method: "POST",
    body: JSON.stringify(opts ?? {}),
  });
}

// --- Meta ---

export async function getAgentTypes() {
  return apiFetch<string[]>("/agent-types");
}

export async function getModels() {
  return apiFetch<string[]>("/models");
}

// --- Teams ---

export async function getTeams() {
  return apiFetch<import("@crew/core/status.ts").TeamSummary[]>("/teams");
}

export async function getTeam(name: string) {
  return apiFetch<import("@crew/core/status.ts").TeamDetail>(`/teams/${encodeURIComponent(name)}`);
}

export async function startTeam(name: string) {
  return apiFetch<StartTeamResult>(`/teams/${encodeURIComponent(name)}/start`, { method: "POST" });
}

export async function destroyTeam(name: string) {
  return apiFetch<{ name: string }>(`/teams/${encodeURIComponent(name)}`, { method: "DELETE" });
}

// --- Agents ---

export async function startAgent(team: string, agent: string) {
  return apiFetch<StartAgentResult>(`/teams/${encodeURIComponent(team)}/agents/${encodeURIComponent(agent)}/start`, { method: "POST" });
}

export async function stopAgent(team: string, agent: string) {
  return apiFetch<{ stopped: boolean }>(`/teams/${encodeURIComponent(team)}/agents/${encodeURIComponent(agent)}/stop`, { method: "POST" });
}

export async function removeAgent(team: string, agent: string) {
  return apiFetch<void>(`/teams/${encodeURIComponent(team)}/agents/${encodeURIComponent(agent)}`, { method: "DELETE" });
}

// --- Messages ---

export async function getAgentInbox(team: string, agent: string, opts?: { unreadOnly?: boolean }) {
  const params = opts?.unreadOnly ? "?status=unread" : "";
  return apiFetch<import("@crew/core/inbox.ts").InboxResult>(`/teams/${encodeURIComponent(team)}/agents/${encodeURIComponent(agent)}/inbox${params}`);
}

export async function sendMessage(team: string, agent: string, message: string, from?: string) {
  return apiFetch<void>(`/teams/${encodeURIComponent(team)}/agents/${encodeURIComponent(agent)}/inbox`, {
    method: "POST",
    body: JSON.stringify({ message, from }),
  });
}

export async function getCrewMessages(team: string, opts?: { unreadOnly?: boolean }) {
  const params = opts?.unreadOnly ? "?status=unread" : "";
  return apiFetch<import("@crew/core/crew-channel.ts").CrewChannelResult>(`/teams/${encodeURIComponent(team)}/messages${params}`);
}

// --- Health ---

export async function healthCheck() {
  return apiFetch<HealthCheckResult>("/health");
}
