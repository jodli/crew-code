import { defineCommand, runMain } from "citty";
import create from "./cli/commands/create.ts";
import spawn from "./cli/commands/spawn.ts";

const main = defineCommand({
  meta: {
    name: "crew",
    description: "CLI tool for managing Claude Code agent teams",
    version: "0.1.0",
  },
  subCommands: {
    create,
    spawn,
  },
});

runMain(main);
