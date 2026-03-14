import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";

export interface AppContext {
  configStore: ConfigStore;
  inboxStore: InboxStore;
}
