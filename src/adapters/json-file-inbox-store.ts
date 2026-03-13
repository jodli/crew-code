import { existsSync } from "node:fs";
import { mkdir, readdir } from "node:fs/promises";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import {
  claudeInboxesDir as defaultInboxesDir,
  claudeInboxPath as defaultInboxPath,
} from "../config/paths.ts";
import { readJson, writeJson } from "../lib/json-io.ts";
import { InboxSchema } from "../config/schemas.ts";

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

  async readMessages(
    team: string,
    agent: string,
  ): Promise<Result<InboxMessage[]>> {
    const path = this.deps.inboxPath(team, agent);
    if (!existsSync(path)) {
      return ok([]);
    }
    return readJson(path, InboxSchema);
  }

  async listInboxes(team: string): Promise<Result<string[]>> {
    const dir = this.deps.inboxesDir(team);
    if (!existsSync(dir)) {
      return ok([]);
    }
    try {
      const entries = await readdir(dir);
      const agents = entries
        .filter((e) => e.endsWith(".json"))
        .map((e) => e.replace(/\.json$/, ""));
      return ok(agents);
    } catch (e: unknown) {
      return err({
        kind: "file_read_failed",
        path: dir,
        detail: String(e),
      });
    }
  }
}
