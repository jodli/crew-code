import { defineCommand } from "citty";
import pc from "picocolors";
import { spawn } from "../../core/spawn.ts";
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
      required: true,
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
  },
  async run({ args }) {
    const ora = (await import("ora")).default;
    const spinner = ora("Spawning agent...").start();

    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      launcher: new TmuxLauncher(),
    };

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
  },
});
