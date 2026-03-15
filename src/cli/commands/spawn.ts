import { defineCommand } from "citty";
import pc from "picocolors";
import { spawnAgent } from "../../actions/spawn-agent.ts";
import { launchClaude } from "../../lib/exec-claude.ts";
import { activateAgent } from "../../core/spawn.ts";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { renderError } from "../errors.ts";
import { parsePassthroughArgs } from "../../lib/parse-passthrough-args.ts";
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
      description: "Agent color",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const result = await spawnAgent(ctx, {
      team: args.team,
      task: args.task,
      name: args.name || undefined,
      model: args.model || undefined,
      color: args.color || undefined,
      extraArgs: parsePassthroughArgs(rawArgs),
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(
      `Agent ${pc.bold(result.value.name)} registered in ${pc.bold(args.team)}`,
    );
    console.error(`  Agent ID: ${result.value.agentId}`);
    console.error(`  Launching Claude...\n`);
    const { pid, exited } = launchClaude(result.value.launchOptions);
    await activateAgent(ctx, args.team, result.value.agentId, String(pid));
    const code = await exited;
    process.exit(code);
  },
});
