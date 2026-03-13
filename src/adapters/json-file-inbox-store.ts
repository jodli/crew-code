import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import {
  claudeInboxesDir as defaultInboxesDir,
  claudeInboxPath as defaultInboxPath,
} from "../config/paths.ts";
import { writeJson } from "../lib/json-io.ts";

export interface InboxStoreDeps {
  inboxesDir: (team: string) => string;
  inboxPath: (team: string, agent: string) => string;
}

const defaultDeps: InboxStoreDeps = {
  inboxesDir: defaultInboxesDir,
  inboxPath: defaultInboxPath,
};

export class JsonFileInboxStore implements InboxStore {
  private deps: InboxStoreDeps;

  constructor(deps: Partial<InboxStoreDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async createInbox(
    team: string,
    agent: string,
    messages: InboxMessage[] = [],
  ): Promise<Result<void>> {
    const dir = this.deps.inboxesDir(team);
    await mkdir(dir, { recursive: true });
    const path = this.deps.inboxPath(team, agent);
    return writeJson(path, messages);
  }
}
