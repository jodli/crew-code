import { defineCommand } from "citty";
import { JsonFileConfigStore } from "../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../adapters/json-file-inbox-store.ts";
import { updateTeam } from "../../actions/update-team.ts";
import { updateAgent } from "../../actions/update-agent.ts";
import { renderError } from "../errors.ts";
import type { AppContext } from "../../types/context.ts";

export default defineCommand({
  meta: {
    name: "update",
    description: "Update team or agent properties",
  },
  args: {
    team: {
      type: "string",
      description: "Team name",
      required: true,
    },
    description: {
      type: "string",
      alias: "d",
      description: "Update team description",
      required: false,
    },
    agent: {
      type: "string",
      alias: "a",
      description: "Target agent name (switches to agent update mode)",
      required: false,
    },
    model: {
      type: "string",
      description: "Update agent model (requires --agent)",
      required: false,
    },
    color: {
      type: "string",
      description: "Update agent color (requires --agent)",
      required: false,
    },
    prompt: {
      type: "string",
      description: "Update agent prompt (requires --agent)",
      required: false,
    },
  },
  async run({ args }) {
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
    };

    if (args.agent) {
      const result = await updateAgent(ctx, {
        team: args.team,
        name: args.agent,
        model: args.model,
        color: args.color,
        prompt: args.prompt,
      });
      if (!result.ok) {
        console.error(renderError(result.error));
        process.exit(1);
      }
      console.error(`Agent "${args.agent}" in team "${args.team}" updated.`);
      return;
    }

    // Agent-only flags without --agent
    if (args.model || args.color || args.prompt) {
      console.error("--model, --color, and --prompt require --agent to be specified.");
      process.exit(1);
    }

    if (args.description === undefined) {
      console.error("Nothing to update. Use --description or --agent with update flags.");
      process.exit(1);
    }

    const result = await updateTeam(ctx, {
      team: args.team,
      description: args.description,
    });
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }
    console.error(`Team "${args.team}" updated.`);
  },
});
