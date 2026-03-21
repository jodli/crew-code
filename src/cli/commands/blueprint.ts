import { defineCommand } from "citty";
import list from "./blueprint/list.ts";
import load from "./blueprint/load.ts";
import newCmd from "./blueprint/new.ts";
import save from "./blueprint/save.ts";
import show from "./blueprint/show.ts";
import update from "./blueprint/update.ts";

export default defineCommand({
  meta: {
    name: "blueprint",
    description: "Manage team blueprints",
  },
  subCommands: {
    list,
    new: newCmd,
    save,
    load,
    show,
    update,
  },
});
