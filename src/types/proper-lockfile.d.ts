declare module "proper-lockfile" {
  interface LockOptions {
    retries?: number;
    stale?: number;
  }
  export function lock(path: string, opts?: LockOptions): Promise<() => Promise<void>>;
}
