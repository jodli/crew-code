import { defineCommand, runMain } from "citty";
import attach from "./cli/commands/attach.ts";
import create from "./cli/commands/create.ts";
import spawn from "./cli/commands/spawn.ts";
import status from "./cli/commands/status.ts";
import send from "./cli/commands/send.ts";
import destroy from "./cli/commands/destroy.ts";
import doctor from "./cli/commands/doctor.ts";
import inbox from "./cli/commands/inbox.ts";
import remove from "./cli/commands/remove.ts";
import tui from "./cli/commands/tui.ts";
import blueprint from "./cli/commands/blueprint.ts";

const main = defineCommand({
  meta: {
    name: "crew",
    description: "CLI tool for managing Claude Code agent teams",
    version: "0.1.0",
  },
  subCommands: {
    attach,
    create,
    spawn,
    status,
    send,
    destroy,
    doctor,
    inbox,
    remove,
    tui,
    blueprint,
  },
});

runMain(main);
