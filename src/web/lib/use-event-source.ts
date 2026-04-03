import { useEffect, useRef } from "react";

interface UseEventSourceOptions {
  /** URL to connect to. Pass `null` to skip connecting. */
  url: string | null;
  /** Called when a message event is received. */
  onMessage?: (event: MessageEvent) => void;
  /** Called when an error event occurs. */
  onError?: (event: Event) => void;
}

/**
 * React hook that manages an EventSource (SSE) connection.
 *
 * Connects when `url` is non-null, disconnects on unmount or when `url` changes.
 * Callbacks are intentionally excluded from the dependency array to avoid
 * reconnection loops when the caller passes inline functions.
 */
export function useEventSource({ url, onMessage, onError }: UseEventSourceOptions) {
  const esRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs in sync without triggering reconnection
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => onMessageRef.current?.(event);
    es.onerror = (event) => onErrorRef.current?.(event);

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [url]);

  return {
    close: () => {
      esRef.current?.close();
    },
  };
}
