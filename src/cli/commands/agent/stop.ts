import { defineCommand } from "citty";
import pc from "picocolors";
import { stopAgent } from "../../../actions/stop-agent.ts";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "stop",
    description: "Stop a running agent",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name",
      required: true,
    },
    name: {
      type: "string",
      description: "Agent name to stop",
      required: true,
    },
  },
  async run({ args }) {
    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const teamResult = await ctx.configStore.getTeam(args.team);
    if (!teamResult.ok) {
      console.error(renderError(teamResult.error));
      process.exit(1);
    }

    const config = teamResult.value;
    const member = config.members.find((m) => m.name === args.name);
    if (!member) {
      console.error(`Agent "${args.name}" not found in team "${args.team}".`);
      process.exit(1);
    }

    const running = await processRegistry.isRunning(args.team, member.agentId);
    if (!running) {
      console.log(`Agent ${pc.bold(args.name)} is not running.`);
      return;
    }

    const result = await stopAgent(processRegistry, args.team, member.agentId);
    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    console.log(`Agent "${args.name}" stopped.`);
  },
});
