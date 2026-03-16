import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { BlueprintStore } from "../ports/blueprint-store.ts";

export interface AppContext {
  configStore: ConfigStore;
  inboxStore: InboxStore;
  blueprintStore?: BlueprintStore;
}
