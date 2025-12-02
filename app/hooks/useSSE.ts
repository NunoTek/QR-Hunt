import { useCallback, useEffect, useRef, useState } from "react";
import { SSE } from "~/config/constants";

export interface SSEEventHandler<T = unknown> {
  event: string;
  handler: (data: T) => void;
}

export interface UseSSEOptions {
  /** URL for the SSE endpoint */
  url: string;
  /** Event handlers for different event types */
  events: SSEEventHandler[];
  /** Whether to automatically connect on mount (default: true) */
  autoConnect?: boolean;
  /** Reconnection delay in ms (default: SSE.RECONNECT_DELAY_MS) */
  reconnectDelay?: number;
  /** Maximum reconnection attempts (default: 10, -1 for unlimited) */
  maxReconnectAttempts?: number;
}

export interface UseSSEReturn {
  /** Whether the connection is currently open */
  isConnected: boolean;
  /** Manually connect to the SSE endpoint */
  connect: () => void;
  /** Manually disconnect from the SSE endpoint */
  disconnect: () => void;
  /** Current reconnection attempt count */
  reconnectAttempts: number;
}

/**
 * Custom hook for managing Server-Sent Events (SSE) connections
 * with automatic reconnection and event handling.
 */
export function useSSE({
  url,
  events,
  autoConnect = true,
  reconnectDelay = SSE.RECONNECT_DELAY_MS,
  maxReconnectAttempts = 10,
}: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventsRef = useRef(events);

  // Keep events ref updated
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    // Don't connect if already connected
    if (eventSourceRef.current) return;

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setReconnectAttempts(0);
    };

    // Register all event listeners
    eventsRef.current.forEach(({ event, handler }) => {
      eventSource.addEventListener(event, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler(data);
        } catch (err) {
          console.error(`Failed to parse SSE event '${event}':`, err);
        }
      });
    });

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnection if not at max attempts
      if (maxReconnectAttempts === -1 || reconnectAttempts < maxReconnectAttempts) {
        setReconnectAttempts((prev) => prev + 1);
        reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
      }
    };
  }, [url, reconnectDelay, maxReconnectAttempts, reconnectAttempts]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    reconnectAttempts,
  };
}

/**
 * Helper to create type-safe event handlers
 */
export function createSSEHandler<T>(
  event: string,
  handler: (data: T) => void
): SSEEventHandler<T> {
  return { event, handler };
}
