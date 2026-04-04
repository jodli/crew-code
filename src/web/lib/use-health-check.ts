import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { healthCheck } from "./api-client.ts";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

const DISCONNECTED_THRESHOLD = 3;

export function useHealthCheck(interval = 10_000) {
  const consecutiveFailures = useRef(0);
  const lastErrorUpdatedAt = useRef(0);
  const lastDataUpdatedAt = useRef(0);

  const query = useQuery({
    queryKey: ["health"],
    queryFn: healthCheck,
    refetchInterval: interval,
    retry: false,
  });

  // Track consecutive failures by detecting timestamp changes.
  // We do this during render (not in an effect) to avoid lint warnings
  // about extra dependencies while still detecting each poll cycle.
  if (query.isSuccess && query.dataUpdatedAt !== lastDataUpdatedAt.current) {
    lastDataUpdatedAt.current = query.dataUpdatedAt;
    consecutiveFailures.current = 0;
  }
  if (query.isError && query.errorUpdatedAt !== lastErrorUpdatedAt.current) {
    lastErrorUpdatedAt.current = query.errorUpdatedAt;
    consecutiveFailures.current += 1;
  }

  let status: ConnectionStatus;
  if (query.isSuccess) {
    status = "connected";
  } else if (consecutiveFailures.current >= DISCONNECTED_THRESHOLD) {
    status = "disconnected";
  } else if (query.isError || consecutiveFailures.current > 0) {
    status = "reconnecting";
  } else {
    // initial loading state before first check completes
    status = "connected";
  }

  return {
    status,
    version: query.data?.version,
    uptime: query.data?.uptime,
  };
}
