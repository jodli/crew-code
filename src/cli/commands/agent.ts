import { defineCommand } from "citty";
import attach from "./agent/attach.ts";
import inbox from "./agent/inbox.ts";
import list from "./agent/list.ts";
import remove from "./agent/remove.ts";
import send from "./agent/send.ts";
import spawn from "./agent/spawn.ts";
import update from "./agent/update.ts";

export default defineCommand({
  meta: { name: "agent", description: "Manage agents" },
  subCommands: { spawn, attach, remove, update, send, inbox, list },
});
