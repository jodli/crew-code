import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "crew",
    description: "CLI tool for managing Claude Code agent teams",
    version: "0.1.0",
  },
  subCommands: {
    // Commands added in later phases
  },
});

runMain(main);
