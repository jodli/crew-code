import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestTeam {
  name: string;
  dir: string;
  configPath: string;
  inboxesDir: string;
  leadSessionId: string;
  cleanup: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function teamsDir(): string {
  return join(homedir(), ".claude", "teams");
}

function teamDir(name: string): string {
  return join(teamsDir(), name);
}

// ---------------------------------------------------------------------------
// Claude Code version
// ---------------------------------------------------------------------------

export async function getClaudeVersion(): Promise<string> {
  try {
    const proc = Bun.spawn(["claude", "--version"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    return stdout.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Team creation / cleanup
// ---------------------------------------------------------------------------

export async function createTestTeam(testSlug: string): Promise<TestTeam> {
  const ts = Date.now();
  const name = `compat-${testSlug}-${ts}`;
  const dir = teamDir(name);
  const inboxesDir = join(dir, "inboxes");
  const configPath = join(dir, "config.json");
  const leadSessionId = randomUUID();

  await mkdir(inboxesDir, { recursive: true });

  const config = {
    name,
    createdAt: ts,
    leadAgentId: `team-lead@${name}`,
    leadSessionId,
    members: [
      {
        agentId: `team-lead@${name}`,
        name: "team-lead",
        agentType: "team-lead",
        joinedAt: ts,
        processId: "",
        cwd: process.cwd(),
        subscriptions: [],
      },
    ],
  };

  await writeFile(configPath, JSON.stringify(config, null, 2));

  const cleanup = async () => {
    try {
      await rm(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  };

  return { name, dir, configPath, inboxesDir, leadSessionId, cleanup };
}

// ---------------------------------------------------------------------------
// Agent registration + inbox seeding
// ---------------------------------------------------------------------------

export async function registerAgent(
  team: TestTeam,
  agentName: string,
  opts: { color?: string; model?: string } = {},
): Promise<void> {
  const raw = await readFile(team.configPath, "utf-8");
  const config = JSON.parse(raw);

  const agentId = `${agentName}@${team.name}`;
  config.members.push({
    agentId,
    name: agentName,
    model: opts.model,
    color: opts.color,
    joinedAt: Date.now(),
    processId: "",
    cwd: process.cwd(),
    subscriptions: [],
    isActive: true,
  });

  await writeFile(team.configPath, JSON.stringify(config, null, 2));
}

export async function seedInbox(
  team: TestTeam,
  agentName: string,
  message: string,
  from = "team-lead",
): Promise<void> {
  const inboxPath = join(team.inboxesDir, `${agentName}.json`);
  const msg = [
    {
      from,
      text: message,
      timestamp: new Date().toISOString(),
      read: false,
    },
  ];
  await writeFile(inboxPath, JSON.stringify(msg, null, 2));
}

// ---------------------------------------------------------------------------
// Launch agent in tmux
// ---------------------------------------------------------------------------

export async function launchAgent(
  team: TestTeam,
  agentName: string,
  opts: {
    color?: string;
    parentSessionId?: string;
    model?: string;
    env?: Record<string, string>;
  } = {},
): Promise<string> {
  const agentId = `${agentName}@${team.name}`;
  const claudeArgs = [
    "--agent-id",
    agentId,
    "--agent-name",
    agentName,
    "--team-name",
    team.name,
  ];

  if (opts.color) claudeArgs.push("--agent-color", opts.color);
  if (opts.parentSessionId)
    claudeArgs.push("--parent-session-id", opts.parentSessionId);
  if (opts.model) claudeArgs.push("--model", opts.model);

  const envPrefix = opts.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === undefined
    ? "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1"
    : `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=${opts.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS}`;

  const cmd = `${envPrefix} claude ${claudeArgs.join(" ")}`;

  const proc = Bun.spawn(
    ["tmux", "split-window", "-h", "-d", "-c", process.cwd(), "-P", "-F", "#{pane_id}", cmd],
    { stdout: "pipe", stderr: "pipe" },
  );

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`tmux split-window failed: ${stderr}`);
  }

  const paneId = stdout.trim();
  if (!paneId) throw new Error("tmux returned empty pane ID");
  return paneId;
}

// ---------------------------------------------------------------------------
// Kill agent pane
// ---------------------------------------------------------------------------

export async function killPane(paneId: string): Promise<void> {
  try {
    const proc = Bun.spawn(["tmux", "kill-pane", "-t", paneId], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
  } catch {
    // pane may already be gone
  }
}

// ---------------------------------------------------------------------------
// Poll inbox for a response
// ---------------------------------------------------------------------------

export async function pollInbox(
  team: TestTeam,
  agentName: string,
  opts: {
    timeoutMs?: number;
    intervalMs?: number;
    minMessages?: number;
  } = {},
): Promise<unknown[]> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const intervalMs = opts.intervalMs ?? 1_000;
  const minMessages = opts.minMessages ?? 1;
  const inboxPath = join(team.inboxesDir, `${agentName}.json`);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const raw = await readFile(inboxPath, "utf-8");
      const messages = JSON.parse(raw);
      if (Array.isArray(messages) && messages.length >= minMessages) {
        return messages;
      }
    } catch {
      // file may not exist yet
    }
    await Bun.sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for ${minMessages} message(s) in ${agentName} inbox after ${timeoutMs}ms`,
  );
}

// ---------------------------------------------------------------------------
// Read config.json
// ---------------------------------------------------------------------------

export async function readConfig(team: TestTeam): Promise<unknown> {
  const raw = await readFile(team.configPath, "utf-8");
  return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// Read inbox
// ---------------------------------------------------------------------------

export async function readInbox(
  team: TestTeam,
  agentName: string,
): Promise<unknown[]> {
  const inboxPath = join(team.inboxesDir, `${agentName}.json`);
  try {
    const raw = await readFile(inboxPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Append message to existing inbox
// ---------------------------------------------------------------------------

export async function appendToInbox(
  team: TestTeam,
  agentName: string,
  message: string,
  from = "team-lead",
): Promise<void> {
  const inboxPath = join(team.inboxesDir, `${agentName}.json`);
  let messages: unknown[] = [];
  try {
    const raw = await readFile(inboxPath, "utf-8");
    messages = JSON.parse(raw);
  } catch {
    // start fresh
  }

  messages.push({
    from,
    text: message,
    timestamp: new Date().toISOString(),
    read: false,
  });

  await writeFile(inboxPath, JSON.stringify(messages, null, 2));
}

// ---------------------------------------------------------------------------
// Default model for compat tests (haiku to minimize cost)
// ---------------------------------------------------------------------------

export const COMPAT_MODEL = "claude-haiku-4-5-20251001";

// ---------------------------------------------------------------------------
// Wait for agent to go idle (pane still alive but no new messages for a bit)
// ---------------------------------------------------------------------------

export async function waitForAgentIdle(
  paneId: string,
  opts: { timeoutMs?: number; quietMs?: number } = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const quietMs = opts.quietMs ?? 5_000;
  const deadline = Date.now() + timeoutMs;

  let lastContent = "";
  let stableSince = Date.now();

  while (Date.now() < deadline) {
    try {
      const proc = Bun.spawn(
        ["tmux", "capture-pane", "-t", paneId, "-p"],
        { stdout: "pipe", stderr: "pipe" },
      );
      const content = await new Response(proc.stdout).text();
      await proc.exited;

      if (content !== lastContent) {
        lastContent = content;
        stableSince = Date.now();
      } else if (Date.now() - stableSince >= quietMs) {
        return; // pane content stable for long enough
      }
    } catch {
      return; // pane gone
    }
    await Bun.sleep(1_000);
  }

  throw new Error(`Agent pane ${paneId} did not go idle within ${timeoutMs}ms`);
}
