import { defineCommand } from "citty";
import create from "./team/create.ts";
import list from "./team/list.ts";
import messages from "./team/messages.ts";
import remove from "./team/remove.ts";
import update from "./team/update.ts";

export default defineCommand({
  meta: { name: "team", description: "Manage teams" },
  subCommands: { create, remove, update, list, messages },
});
