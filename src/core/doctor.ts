import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";
import { isProcessAlive } from "../lib/process.ts";
import { sessionExistsOnDisk } from "../lib/claude-session.ts";
import { executeRemove, type RemovePlan } from "./remove.ts";

export type DiagnosticStatus = "ok" | "warn" | "error";

export interface DiagnosticResult {
  checkId: string;
  status: DiagnosticStatus;
  message: string;
  detail?: string;
  team?: string;
  fixable: boolean;
  fix?: (ctx: AppContext) => Promise<Result<string>>;
}

export interface DiagnoseInput {
  team?: string;
  checkSession?: (cwd: string, sessionId: string) => boolean;
}

export interface FixResult {
  checkId: string;
  message: string;
}

export async function diagnose(
  ctx: AppContext,
  input: DiagnoseInput,
): Promise<Result<DiagnosticResult[]>> {
  const results: DiagnosticResult[] = [];

  // Check 1: claude CLI installed
  try {
    const proc = Bun.spawn(["which", "claude"], { stdout: "pipe", stderr: "pipe" });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      results.push({
        checkId: "claude-installed",
        status: "error",
        message: "Claude Code CLI is not installed",
        fixable: false,
      });
    } else {
      results.push({
        checkId: "claude-installed",
        status: "ok",
        message: "Claude Code CLI is available",
        fixable: false,
      });
    }
  } catch {
    results.push({
      checkId: "claude-installed",
      status: "error",
      message: "Could not check for Claude Code CLI",
      fixable: false,
    });
  }

  // Get team list
  let teamNames: string[];
  if (input.team) {
    teamNames = [input.team];
  } else {
    const listResult = await ctx.configStore.listTeams();
    if (!listResult.ok) return listResult;
    teamNames = listResult.value;
  }

  // Per-team checks
  for (const teamName of teamNames) {
    const teamResult = await ctx.configStore.getTeam(teamName);

    if (!teamResult.ok) {
      // Check: config schema / parse errors
      const error = teamResult.error;
      if (
        error.kind === "schema_validation_failed" ||
        error.kind === "json_parse_failed" ||
        error.kind === "config_corrupt"
      ) {
        results.push({
          checkId: "config-schema",
          status: "error",
          message: `Config for team "${teamName}" has validation errors`,
          detail: "detail" in error ? error.detail : undefined,
          team: teamName,
          fixable: false,
        });
      } else {
        results.push({
          checkId: "config-schema",
          status: "error",
          message: `Cannot read config for team "${teamName}"`,
          detail: error.kind,
          team: teamName,
          fixable: false,
        });
      }
      continue;
    }

    const config = teamResult.value;
    const memberNames = new Set(config.members.map((m) => m.name));

    // Check: stale isActive (process is gone but isActive is true)
    for (const member of config.members) {
      if (member.isActive) {
        const pid = parseInt(member.processId, 10);
        const alive = isProcessAlive(pid);
        if (!alive) {
          results.push({
            checkId: "stale-active",
            status: "warn",
            message: `Agent "${member.name}" in team "${teamName}" is marked active but process ${member.processId} is gone`,
            detail: member.name,
            team: teamName,
            fixable: true,
            fix: async (fixCtx: AppContext) => {
              const agentName = member.name;
              const updateResult = await fixCtx.configStore.updateTeam(
                teamName,
                (cfg) => ({
                  ...cfg,
                  members: cfg.members.map((m) =>
                    m.name === agentName ? { ...m, isActive: false } : m,
                  ),
                }),
              );
              if (!updateResult.ok) return updateResult;
              return ok(`Set ${agentName} isActive to false in team "${teamName}"`);
            },
          });
        }
      }
    }

    // Check: stale session (sessionId stored but no file on disk)
    const checkSession = input.checkSession ?? sessionExistsOnDisk;
    for (const member of config.members) {
      if (member.sessionId) {
        if (!checkSession(member.cwd, member.sessionId)) {
          const agentName = member.name;
          const agentId = member.agentId;
          const processId = member.processId;
          results.push({
            checkId: "stale-session",
            status: "warn",
            message: `Agent "${agentName}" in team "${teamName}" has a stale session (no conversation on disk)`,
            detail: agentName,
            team: teamName,
            fixable: true,
            fix: async (fixCtx: AppContext) => {
              const inboxList = await fixCtx.inboxStore.listInboxes(teamName);
              const hasInbox = inboxList.ok ? inboxList.value.includes(agentName) : false;
              const plan: RemovePlan = {
                team: teamName,
                name: agentName,
                agentId,
                processId,
                isAlive: false,
                hasInbox,
              };
              const removeResult = await executeRemove(fixCtx, plan);
              if (!removeResult.ok) return removeResult;
              return ok(`Removed agent "${agentName}" from team "${teamName}"`);
            },
          });
        }
      }
    }

    // Check: orphaned inbox files
    const inboxResult = await ctx.inboxStore.listInboxes(teamName);
    const inboxes = inboxResult.ok ? inboxResult.value : [];

    for (const inbox of inboxes) {
      if (!memberNames.has(inbox)) {
        results.push({
          checkId: "orphaned-inbox",
          status: "warn",
          message: `Orphaned inbox "${inbox}" in team "${teamName}" has no matching member`,
          detail: inbox,
          team: teamName,
          fixable: true,
          fix: async (fixCtx: AppContext) => {
            const deleteResult = await fixCtx.inboxStore.deleteInbox(
              teamName,
              inbox,
            );
            if (!deleteResult.ok) return deleteResult;
            return ok(`Deleted orphaned inbox "${inbox}" in team "${teamName}"`);
          },
        });
      }
    }

    // Check: inbox JSON validity for known members
    for (const inbox of inboxes) {
      if (memberNames.has(inbox)) {
        const readResult = await ctx.inboxStore.readMessages(teamName, inbox);
        if (!readResult.ok) {
          const error = readResult.error;
          if (
            error.kind === "json_parse_failed" ||
            error.kind === "schema_validation_failed"
          ) {
            results.push({
              checkId: "inbox-json",
              status: "error",
              message: `Inbox for "${inbox}" in team "${teamName}" has invalid JSON`,
              detail: inbox,
              team: teamName,
              fixable: false,
            });
          }
        }
      }
    }
  }

  return ok(results);
}

export async function applyFixes(
  ctx: AppContext,
  diagnostics: DiagnosticResult[],
): Promise<Result<FixResult[]>> {
  const fixResults: FixResult[] = [];

  for (const diag of diagnostics) {
    if (diag.fixable && diag.fix) {
      const result = await diag.fix(ctx);
      if (!result.ok) return result;
      fixResults.push({
        checkId: diag.checkId,
        message: result.value,
      });
    }
  }

  return ok(fixResults);
}
