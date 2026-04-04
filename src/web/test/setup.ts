import "@testing-library/jest-dom/vitest";
import { setupServer } from "msw/node";
import { handlers } from "./msw-handlers.ts";

// happy-dom localStorage shim (some versions expose a non-standard API)
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.getItem !== "function") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  } as Storage;
}

// EventSource shim for happy-dom (doesn't support SSE natively)
if (typeof globalThis.EventSource === "undefined") {
  globalThis.EventSource = class EventSource {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    readyState = 0;
    url: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onopen: ((event: Event) => void) | null = null;
    constructor(url: string) {
      this.url = url;
      this.readyState = 1; // OPEN
    }
    close() {
      this.readyState = 2;
    }
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return false;
    }
  } as unknown as typeof EventSource;
}

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => server.close());
