import type { ConfigStore } from "../ports/config-store.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { Launcher } from "../ports/launcher.ts";

export interface AppContext {
  configStore: ConfigStore;
  inboxStore: InboxStore;
  launcher: Launcher;
}
