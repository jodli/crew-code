import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { server } from "../test/setup.ts";
import { useHealthCheck } from "./use-health-check.ts";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { wrapper: Wrapper, queryClient };
}

describe("useHealthCheck", () => {
  it("returns connected when health check succeeds", async () => {
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useHealthCheck(500), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("connected");
      expect(result.current.version).toBe("0.1.6");
      expect(result.current.uptime).toBe(12345);
    });
  });

  it("returns reconnecting after 1-2 failures", async () => {
    server.use(http.get("/api/health", () => HttpResponse.json({ error: "down" }, { status: 500 })));

    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useHealthCheck(100), { wrapper });

    await waitFor(() => {
      expect(result.current.status).toBe("reconnecting");
    });
  });

  it("returns disconnected after 3+ failures", async () => {
    server.use(http.get("/api/health", () => HttpResponse.json({ error: "down" }, { status: 500 })));

    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useHealthCheck(50), { wrapper });

    // Wait for enough polling cycles to accumulate 3+ failures
    await waitFor(
      () => {
        expect(result.current.status).toBe("disconnected");
      },
      { timeout: 2000 },
    );
  });

  it("recovers to connected after failures", async () => {
    let failCount = 0;
    server.use(
      http.get("/api/health", () => {
        failCount++;
        if (failCount <= 2) {
          return HttpResponse.json({ error: "down" }, { status: 500 });
        }
        return HttpResponse.json({ status: "ok", version: "0.1.6", uptime: 99999 });
      }),
    );

    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useHealthCheck(50), { wrapper });

    // First, should become reconnecting
    await waitFor(() => {
      expect(result.current.status).toBe("reconnecting");
    });

    // Then should recover to connected
    await waitFor(
      () => {
        expect(result.current.status).toBe("connected");
      },
      { timeout: 2000 },
    );

    expect(result.current.uptime).toBe(99999);
  });
});
