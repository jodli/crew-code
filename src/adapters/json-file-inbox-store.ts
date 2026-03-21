import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { claudeInboxesDir as defaultInboxesDir, claudeInboxPath as defaultInboxPath } from "../config/paths.ts";
import { InboxSchema } from "../config/schemas.ts";
import { readJson, withLock, writeJson } from "../lib/json-io.ts";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { err, ok } from "../types/result.ts";

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

  async createInbox(team: string, agent: string, messages: InboxMessage[] = []): Promise<Result<void>> {
    const dir = this.deps.inboxesDir(team);
    await mkdir(dir, { recursive: true });
    const path = this.deps.inboxPath(team, agent);
    return writeJson(path, messages);
  }

  async appendMessage(team: string, agent: string, message: InboxMessage): Promise<Result<void>> {
    const dir = this.deps.inboxesDir(team);
    await mkdir(dir, { recursive: true });
    const path = this.deps.inboxPath(team, agent);

    // Ensure data file exists so proper-lockfile can lock it
    if (!existsSync(path)) {
      await writeFile(path, "[]\n", "utf-8");
    }

    const lockResult = await withLock(path, async () => {
      const raw = await readFile(path, "utf-8");
      let existing: InboxMessage[];
      try {
        existing = JSON.parse(raw);
      } catch {
        existing = [];
      }
      existing.push(message);
      const writeResult = await writeJson(path, existing);
      if (!writeResult.ok) return writeResult;
      return ok(undefined);
    });

    if (!lockResult.ok) return lockResult;
    return lockResult.value;
  }

  async readMessages(team: string, agent: string): Promise<Result<InboxMessage[]>> {
    const path = this.deps.inboxPath(team, agent);
    if (!existsSync(path)) {
      return ok([]);
    }
    return readJson(path, InboxSchema);
  }

  async deleteInbox(team: string, agent: string): Promise<Result<void>> {
    const path = this.deps.inboxPath(team, agent);
    if (!existsSync(path)) {
      return ok(undefined);
    }
    try {
      await unlink(path);
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        kind: "file_write_failed",
        path,
        detail: String(e),
      });
    }
  }

  async markAllRead(team: string, agent: string): Promise<Result<void>> {
    const path = this.deps.inboxPath(team, agent);
    if (!existsSync(path)) {
      return ok(undefined);
    }

    const lockResult = await withLock(path, async () => {
      const raw = await readFile(path, "utf-8");
      let messages: InboxMessage[];
      try {
        messages = JSON.parse(raw);
      } catch {
        return ok(undefined);
      }
      const updated = messages.map((m) => ({ ...m, read: true }));
      const writeResult = await writeJson(path, updated);
      if (!writeResult.ok) return writeResult;
      return ok(undefined);
    });

    if (!lockResult.ok) return lockResult;
    return lockResult.value;
  }

  async listInboxes(team: string): Promise<Result<string[]>> {
    const dir = this.deps.inboxesDir(team);
    if (!existsSync(dir)) {
      return ok([]);
    }
    try {
      const entries = await readdir(dir);
      const agents = entries.filter((e) => e.endsWith(".json")).map((e) => e.replace(/\.json$/, ""));
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
