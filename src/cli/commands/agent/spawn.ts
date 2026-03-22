import { defineCommand } from "citty";
import pc from "picocolors";
import { spawnAgent } from "../../../actions/spawn-agent.ts";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { parsePassthroughArgs } from "../../../lib/parse-passthrough-args.ts";
import { launchAgent } from "../../../runtime/launch.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

const ALLOWED_AGENT_TYPES = ["team-lead", "general-purpose"];

export default defineCommand({
  meta: {
    name: "spawn",
    description: "Spawn a Claude agent into an existing team",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name to spawn into",
      required: true,
    },
    prompt: {
      type: "string",
      description: "System prompt defining the agent's role in the team",
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
    "agent-type": {
      type: "string",
      description: "Agent type (team-lead, general-purpose)",
      required: false,
    },
  },
  async run({ args, rawArgs }) {
    const agentType = args["agent-type"] || "general-purpose";
    if (!ALLOWED_AGENT_TYPES.includes(agentType)) {
      console.error(`Invalid agent type "${agentType}". Allowed: ${ALLOWED_AGENT_TYPES.join(", ")}`);
      process.exit(1);
    }

    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const result = await spawnAgent(ctx, {
      team: args.team,
      prompt: args.prompt || undefined,
      name: args.name || undefined,
      agentType,
      model: args.model || undefined,
      color: args.color || undefined,
      extraArgs: parsePassthroughArgs(rawArgs),
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.error(`Agent ${pc.bold(result.value.name)} registered in ${pc.bold(args.team)}`);
    console.error(`  Agent ID: ${result.value.agentId}`);
    console.error(`  Launching Claude...\n`);
    const { pid, exited } = launchAgent(result.value.launchOptions);
    const activateResult = await processRegistry.activate(args.team, result.value.agentId, pid);
    if (!activateResult.ok) {
      console.error(
        `Warning: failed to register process: ${"detail" in activateResult.error ? activateResult.error.detail : activateResult.error.kind}`,
      );
    }
    const code = await exited;
    process.exit(code);
  },
});
