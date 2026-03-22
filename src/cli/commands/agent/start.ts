import { defineCommand } from "citty";
import pc from "picocolors";
import { startAgent } from "../../../actions/start-agent.ts";
import { FileProcessRegistry } from "../../../adapters/file-process-registry.ts";
import { JsonFileConfigStore } from "../../../adapters/json-file-config-store.ts";
import { JsonFileInboxStore } from "../../../adapters/json-file-inbox-store.ts";
import { parsePassthroughArgs } from "../../../lib/parse-passthrough-args.ts";
import { launchAgent } from "../../../runtime/launch.ts";
import type { AppContext } from "../../../types/context.ts";
import { renderError } from "../../errors.ts";

export default defineCommand({
  meta: {
    name: "start",
    description: "Start an agent process (interactive or headless)",
  },
  args: {
    team: {
      type: "positional",
      description: "Team name to start agent in",
      required: true,
    },
    name: {
      type: "string",
      description: "Agent name to start (defaults to team-lead)",
      required: false,
    },
    headless: {
      type: "boolean",
      description: "Start agent in background via tmux (no terminal attached)",
      required: false,
      default: false,
    },
  },
  async run({ args, rawArgs }) {
    const processRegistry = new FileProcessRegistry();
    const ctx: AppContext = {
      configStore: new JsonFileConfigStore(),
      inboxStore: new JsonFileInboxStore(),
      processRegistry,
    };

    const result = await startAgent(ctx, {
      team: args.team,
      name: args.name || undefined,
    });

    if (!result.ok) {
      console.error(renderError(result.error));
      process.exit(1);
    }

    // Check if agent is already running
    const activeResult = await processRegistry.listActive(args.team);
    const activeEntry = activeResult.ok
      ? activeResult.value.find((e) => e.agentId === result.value.agentId)
      : undefined;
    if (activeEntry) {
      console.error(`Agent "${result.value.name}" is already running.`);
      console.error(`  Stop first:  crew agent stop ${args.team} --name ${result.value.name}`);
      if (activeEntry.mode === "headless") {
        console.error(`  Or connect:  tmux attach -t crew_${args.team}_${result.value.name}`);
      }
      process.exit(1);
    }

    const cliArgs = parsePassthroughArgs(rawArgs);
    if (cliArgs.length > 0) {
      result.value.launchOptions.extraArgs = cliArgs;
      await ctx.configStore.updateTeam(args.team, (cfg) => ({
        ...cfg,
        members: cfg.members.map((m) => (m.agentId === result.value.agentId ? { ...m, extraArgs: cliArgs } : m)),
      }));
    }

    if (args.headless) {
      // Check tmux availability
      const which = Bun.spawn(["which", "tmux"], { stdout: "pipe", stderr: "pipe" });
      const whichCode = await which.exited;
      if (whichCode !== 0) {
        console.error("Error: tmux is required for headless mode but was not found on PATH.");
        process.exit(1);
      }

      const { pid } = launchAgent(result.value.launchOptions, { headless: true });
      const activateResult = await processRegistry.activate(args.team, result.value.agentId, pid, "headless");
      if (!activateResult.ok) {
        console.error(
          `Warning: failed to register process: ${"detail" in activateResult.error ? activateResult.error.detail : activateResult.error.kind}`,
        );
      }
      const tmuxSession = `crew_${args.team}_${result.value.name}`;
      console.error(`Agent "${result.value.name}" started in background (PID: ${pid}).`);
      console.error(`  tmux attach -t ${tmuxSession}`);
      return;
    }

    console.error(`Starting ${pc.bold(result.value.name)} in ${pc.bold(args.team)}...`);
    console.error(`  Resuming session ${result.value.launchOptions.sessionId}\n`);

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
