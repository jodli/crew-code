import { defineCommand, runMain } from "citty";
import pkg from "../package.json";
import agent from "./cli/commands/agent.ts";
import blueprint from "./cli/commands/blueprint.ts";
import doctor from "./cli/commands/doctor.ts";
import serve from "./cli/commands/serve.ts";
import team from "./cli/commands/team.ts";
import tui from "./cli/commands/tui.ts";

const main = defineCommand({
  meta: {
    name: "crew",
    description: "CLI tool for managing Claude Code agent teams",
    version: pkg.version,
  },
  subCommands: {
    team,
    agent,
    blueprint,
    doctor,
    tui,
    serve,
  },
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

runMain(main);
