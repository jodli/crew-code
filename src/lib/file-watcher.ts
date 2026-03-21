import { existsSync, readdirSync, watch } from "node:fs";
import { basename, dirname, join } from "node:path";
import { debug } from "./logger.ts";

const HEARTBEAT_INTERVAL_MS = 5000;

export function watchFile(filePath: string, callback: () => void): () => void {
  const dir = dirname(filePath);
  const file = basename(filePath);
  let lastMtime = getFileMtime(filePath);

  const watcher = watch(dir, (_event, filename) => {
    if (filename === file) {
      const mtime = getFileMtime(filePath);
      if (mtime !== lastMtime) {
        lastMtime = mtime;
        callback();
      }
    }
  });

  // Heartbeat poll as fallback for Bun/Linux fs.watch bugs
  const interval = setInterval(() => {
    const mtime = getFileMtime(filePath);
    if (mtime !== lastMtime) {
      lastMtime = mtime;
      callback();
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    watcher.close();
    clearInterval(interval);
  };
}

export function watchDir(dirPath: string, callback: (filename: string) => void): () => void {
  const mtimes = new Map<string, number>();

  const watcher = watch(dirPath, (_event, filename) => {
    if (filename) {
      const mtime = getFileMtime(`${dirPath}/${filename}`);
      if (mtime !== (mtimes.get(filename) ?? 0)) {
        mtimes.set(filename, mtime);
        callback(filename);
      }
    }
  });

  // Heartbeat poll as fallback
  const interval = setInterval(() => {
    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        const mtime = getFileMtime(join(dirPath, entry));
        if (mtime !== (mtimes.get(entry) ?? 0)) {
          mtimes.set(entry, mtime);
          callback(entry);
        }
      }
    } catch (e: unknown) {
      debug("watcher", `poll failed for ${dirPath}`, { error: String(e) });
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => {
    watcher.close();
    clearInterval(interval);
  };
}

export function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

function getFileMtime(filePath: string): number {
  try {
    if (!existsSync(filePath)) return 0;
    const stat = Bun.file(filePath);
    return stat.lastModified;
  } catch (e: unknown) {
    debug("watcher", `getFileMtime failed for ${filePath}`, { error: String(e) });
    return 0;
  }
}
