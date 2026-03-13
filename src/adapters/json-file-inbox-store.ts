import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile, unlink } from "node:fs/promises";
import type { InboxStore } from "../ports/inbox-store.ts";
import type { InboxMessage } from "../types/domain.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import {
  claudeInboxesDir as defaultInboxesDir,
  claudeInboxPath as defaultInboxPath,
} from "../config/paths.ts";
import { readJson, writeJson, withLock } from "../lib/json-io.ts";
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

  async appendMessage(
    team: string,
    agent: string,
    message: InboxMessage,
  ): Promise<Result<void>> {
    const dir = this.deps.inboxesDir(team);
    await mkdir(dir, { recursive: true });
    const path = this.deps.inboxPath(team, agent);

    // Ensure data file exists
    if (!existsSync(path)) {
      await writeFile(path, "[]\n", "utf-8");
    }

    const { lock } = await import("proper-lockfile");
    let release: (() => Promise<void>) | undefined;
    try {
      release = await lock(path, {
        retries: { retries: 10, minTimeout: 50, maxTimeout: 500 } as unknown as number,
        stale: 10000,
      });
    } catch (e: unknown) {
      return err({
        kind: "lock_failed",
        path,
        detail: String(e),
      });
    }

    try {
      const raw = await readFile(path, "utf-8");
      const existing: InboxMessage[] = JSON.parse(raw);
      existing.push(message);
      await writeFile(path, JSON.stringify(existing, null, 2) + "\n", "utf-8");
      return ok(undefined);
    } catch (e: unknown) {
      return err({
        kind: "file_write_failed",
        path,
        detail: String(e),
      });
    } finally {
      if (release) {
        await release().catch(() => {});
      }
    }
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
