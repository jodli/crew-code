import { defineCommand } from "citty";
import pc from "picocolors";
import { startTeam } from "../../../actions/start-team.ts";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { launchAgent } from "../../../runtime/launch.ts";
import { attachToTeamSession, isTmuxAvailable, teamSessionName } from "../../../runtime/tmux-session.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "start",
    description: "Start all agents in a team via tmux",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name",
      required: true,
    },
    headless: {
      type: "boolean",
      description: "Start in background (no terminal attached)",
      required: false,
      default: false,
    },
    layout: {
      type: "string",
      description: "Tmux layout for agent panes: tiled (default) or main-vertical",
      required: false,
    },
    "main-pane": {
      type: "string",
      description: "Agent name to place on the left in main-vertical layout (defaults to team-lead)",
      required: false,
    },
  },
  async run({ args }) {
    if (!isTmuxAvailable()) {
      console.error("Error: tmux is required for team start but was not found on PATH.");
      console.error("  Install: https://github.com/tmux/tmux");
      process.exit(1);
    }

    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const result = await startTeam(ctx, { team: args.team });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    if (result.value.agents.length === 0) {
      console.error("No agents to start.");
      if (result.value.skipped.length > 0) {
        for (const s of result.value.skipped) {
          console.error(`  Skipped ${s.name}: ${s.reason}`);
        }
      }
      process.exit(1);
    }

    // Check which agents are already running
    const activeResult = await processRegistry.listActive(args.team);
    const activeIds = new Set(activeResult.ok ? activeResult.value.map((e) => e.agentId) : []);

    const layout = args.layout as "tiled" | "main-vertical" | undefined;
    const leadAgent = result.value.agents.find((a) => a.isLead);
    const mainPane = args["main-pane"] ?? leadAgent?.name;

    let started = 0;
    for (const agent of result.value.agents) {
      if (activeIds.has(agent.agentId)) {
        console.error(`  Skipped ${pc.dim(agent.name)} (already running)`);
        continue;
      }

      try {
        const { pid } = launchAgent(agent.launchOptions, { headless: true, layout, mainPane });
        await processRegistry.activate(args.team, agent.agentId, pid, "headless");
        console.error(`  Started ${pc.bold(agent.name)} (PID: ${pid})`);
        started++;
      } catch (e: unknown) {
        console.error(`  Failed ${agent.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    for (const s of result.value.skipped) {
      console.error(`  Skipped ${pc.dim(s.name)}: ${s.reason}`);
    }

    const session = teamSessionName(args.team);
    if (started === 0) {
      console.error("\nNo agents were started.");
      process.exit(1);
    }

    console.error(`\n${started} agent(s) started in session ${pc.cyan(session)}.`);

    if (args.headless) {
      console.error(`  tmux attach -t ${session}`);
      return;
    }

    const code = await attachToTeamSession(args.team);
    process.exit(code);
  },
});
