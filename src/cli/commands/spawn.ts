import { defineCommand } from "citty";
import pc from "picocolors";
import { spawn, registerAgent } from "../../core/spawn.ts";
import { execClaude } from "../../lib/exec-claude.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { TmuxLauncher } from "../../adapters/tmux-launcher.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

export default defineCommand({
  meta: {
    name: "spawn",
    description: "Spawn a Claude agent into an existing team",
  },
  args: {
    team: {
      type: "string",
      description: "Team name to spawn into",
      required: true,
    },
    task: {
      type: "string",
      description: "Initial task message for the agent",
      required: false,
    },
    name: {
      type: "string",
      description: "Agent name (auto-generated if not provided)",
      required: false,
    },
    model: {
      type: "string",
      description: "Claude model to use",
      required: false,
    },
    color: {
      type: "string",
      description: "Agent color in tmux",
      required: false,
    },
    pane: {
      type: "boolean",
      description: "Launch in a new tmux pane instead of the current terminal",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      launcher: new TmuxLauncher(),
    };

    if (args.pane) {
      // Existing flow: spawn in tmux pane
      const ora = (await import("ora")).default;
      const spinner = ora("Spawning agent...").start();

      const result = await spawn(ctx, {
        team: args.team,
        task: args.task,
        name: args.name || undefined,
        model: args.model || undefined,
        color: args.color || undefined,
      });

      if (!result.ok) {
        spinner.fail(renderError(result.error));
        process.exit(1);
      }

      const { agentId, name, paneId } = result.value;
      spinner.succeed(`Agent ${pc.bold(name)} spawned into ${pc.bold(args.team)}`);
      console.error(`  Agent ID: ${agentId}`);
      console.error(`  Pane:     ${paneId}`);
      return;
    }

    // Default: foreground mode
    const regResult = await registerAgent(ctx, {
      team: args.team,
      task: args.task,
      name: args.name || undefined,
      model: args.model || undefined,
      color: args.color || undefined,
    });

    if (!regResult.ok) {
      console.error(renderError(regResult.error));
      process.exit(1);
    }

    console.error(
      `Agent ${pc.bold(regResult.value.name)} registered in ${pc.bold(args.team)}`,
    );
    console.error(`  Agent ID: ${regResult.value.agentId}`);
    console.error(`  Launching Claude...\n`);

    await execClaude(regResult.value.launchOptions);
  },
});
