import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEventSource } from "./use-event-source.ts";

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState = 0; // CONNECTING
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = 1;
    }, 0); // OPEN
  }

  close() {
    this.closed = true;
    this.readyState = 2; // CLOSED
  }

  // Helper: simulate receiving a message
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  // Helper: simulate an error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event("error"));
    }
  }
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useEventSource", () => {
  it("connects to URL and receives events", async () => {
    const onMessage = vi.fn();

    renderHook(() => useEventSource({ url: "/api/stream", onMessage }));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/stream");

    // Simulate a message
    act(() => {
      MockEventSource.instances[0].simulateMessage('{"type":"update"}');
    });

    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage.mock.calls[0][0].data).toBe('{"type":"update"}');
  });

  it("does not connect when url is null", () => {
    renderHook(() => useEventSource({ url: null }));

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("calls onError when error occurs", () => {
    const onError = vi.fn();

    renderHook(() => useEventSource({ url: "/api/stream", onError }));

    act(() => {
      MockEventSource.instances[0].simulateError();
    });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("cleans up on unmount", () => {
    const { unmount } = renderHook(() => useEventSource({ url: "/api/stream" }));

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].closed).toBe(false);

    unmount();

    expect(MockEventSource.instances[0].closed).toBe(true);
  });

  it("reconnects when URL changes", () => {
    const { rerender } = renderHook(({ url }: { url: string | null }) => useEventSource({ url }), {
      initialProps: { url: "/api/stream/a" },
    });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/stream/a");

    rerender({ url: "/api/stream/b" });

    // First one should be closed, second one opened
    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[0].closed).toBe(true);
    expect(MockEventSource.instances[1].url).toBe("/api/stream/b");
    expect(MockEventSource.instances[1].closed).toBe(false);
  });

  it("close function works", () => {
    const { result } = renderHook(() => useEventSource({ url: "/api/stream" }));

    expect(MockEventSource.instances[0].closed).toBe(false);

    act(() => {
      result.current.close();
    });

    expect(MockEventSource.instances[0].closed).toBe(true);
  });
});
