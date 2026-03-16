import { defineCommand } from "citty";
import list from "./blueprint/list.ts";
import newCmd from "./blueprint/new.ts";
import save from "./blueprint/save.ts";
import load from "./blueprint/load.ts";

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
  },
});
