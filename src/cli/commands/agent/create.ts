import { defineCommand } from "citty";
import pc from "picocolors";
import { createAgent } from "../../../actions/create-agent.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { parsePassthroughArgs } from "../../../lib/parse-passthrough-args.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

const ALLOWED_AGENT_TYPES = ["team-lead", "general-purpose"];

export default defineCommand({
  meta: {
    name: "create",
    description: "Create a Claude agent in an existing team",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name to create agent in",
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

    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    const result = await createAgent(ctx, {
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

    console.error(`Agent ${pc.bold(result.value.name)} created in team ${pc.bold(args.team)}`);
    console.error(`\n  Attach to it:`);
    console.error(`  ${pc.cyan(`crew agent attach ${args.team} --name ${result.value.name}`)}\n`);
  },
});
