import type { AppContext } from "../types/context.ts";
import type { Result } from "../types/result.ts";
import { ok } from "../types/result.ts";

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
}

export interface FixResult {
  checkId: string;
  message: string;
}

export async function diagnose(ctx: AppContext, input: DiagnoseInput): Promise<Result<DiagnosticResult[]>> {
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

    // Check: process registry health (triggers self-healing)
    if (ctx.processRegistry) {
      const activeResult = await ctx.processRegistry.listActive(teamName);
      if (activeResult.ok) {
        results.push({
          checkId: "process-registry",
          status: "ok",
          message: `Process registry for team "${teamName}" is healthy (${activeResult.value.length} active)`,
          team: teamName,
          fixable: false,
        });
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
            const deleteResult = await fixCtx.inboxStore.deleteInbox(teamName, inbox);
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
          if (error.kind === "json_parse_failed" || error.kind === "schema_validation_failed") {
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

export async function applyFixes(ctx: AppContext, diagnostics: DiagnosticResult[]): Promise<Result<FixResult[]>> {
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
