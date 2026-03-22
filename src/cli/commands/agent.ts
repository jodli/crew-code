import { defineCommand } from "citty";
import create from "./agent/create.ts";
import inbox from "./agent/inbox.ts";
import list from "./agent/list.ts";
import remove from "./agent/remove.ts";
import send from "./agent/send.ts";
import start from "./agent/start.ts";
import stop from "./agent/stop.ts";
import update from "./agent/update.ts";

export default defineCommand({
  meta: { name: "agent", description: "Manage agents" },
  subCommands: { create, start, stop, remove, update, send, inbox, list },
});
