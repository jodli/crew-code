import { defineCommand, runMain } from "citty";
import pkg from "../package.json";
import attach from "./cli/commands/attach.ts";
import blueprint from "./cli/commands/blueprint.ts";
import create from "./cli/commands/create.ts";

import doctor from "./cli/commands/doctor.ts";
import inbox from "./cli/commands/inbox.ts";
import messages from "./cli/commands/messages.ts";
import remove from "./cli/commands/remove.ts";
import send from "./cli/commands/send.ts";
import serve from "./cli/commands/serve.ts";
import spawn from "./cli/commands/spawn.ts";
import status from "./cli/commands/status.ts";
import tui from "./cli/commands/tui.ts";
import update from "./cli/commands/update.ts";

const main = defineCommand({
  meta: {
    name: "crew",
    description: "CLI tool for managing Claude Code agent teams",
    version: pkg.version,
  },
  subCommands: {
    attach,
    create,
    spawn,
    status,
    send,
    doctor,
    inbox,
    remove,
    tui,
    blueprint,
    messages,
    update,
    serve,
  },
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

runMain(main);
