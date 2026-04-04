import { useEffect, useRef } from "react";

interface UseEventSourceOptions {
  /** URL to connect to. Pass `null` to skip connecting. */
  url: string | null;
  /** Called when an unnamed message event is received (event type "message"). */
  onMessage?: (event: MessageEvent) => void;
  /** Called when an error event occurs. */
  onError?: (event: Event) => void;
  /** Listen for specific named event types (e.g. "team-update", "snapshot"). */
  events?: Record<string, (event: MessageEvent) => void>;
}

/**
 * React hook that manages an EventSource (SSE) connection.
 *
 * Connects when `url` is non-null, disconnects on unmount or when `url` changes.
 * Callbacks are stored in refs to avoid reconnection loops when the caller
 * passes inline functions.
 */
export function useEventSource({ url, onMessage, onError, events }: UseEventSourceOptions) {
  const esRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const eventsRef = useRef(events);

  // Keep refs in sync without triggering reconnection
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;
  eventsRef.current = events;

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => onMessageRef.current?.(event);
    es.onerror = (event) => onErrorRef.current?.(event);

    // Register named event listeners
    const eventNames = Object.keys(eventsRef.current ?? {});
    for (const name of eventNames) {
      es.addEventListener(name, ((event: Event) => {
        eventsRef.current?.[name]?.(event as MessageEvent);
      }) as EventListener);
    }

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
