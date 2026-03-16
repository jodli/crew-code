import { defineCommand } from "citty";
import list from "./blueprint/list.ts";

export default defineCommand({
  meta: {
    name: "blueprint",
    description: "Manage team blueprints",
  },
  subCommands: {
    list,
  },
});
