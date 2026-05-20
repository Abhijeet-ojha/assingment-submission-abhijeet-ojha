"use client";

import { useEffect, useRef, useState } from 'react';
import type { RealtimeEvent } from '@/lib/events';

type DashboardEventState = {
  connected: boolean;
  reconnectAttempts: number;
  lastEvent: RealtimeEvent | null;
  error: string;
};

const EVENT_NAMES = ['lead.allocated', 'lead.webhook', 'dashboard.refresh', 'ping'] as const;
const MAX_RECONNECT_DELAY = 15000;

export function useDashboardEvents(onEvent?: (event: RealtimeEvent) => void) {
  const [state, setState] = useState<DashboardEventState>({
    connected: false,
    reconnectAttempts: 0,
    lastEvent: null,
    error: ''
  });
  const onEventRef = useRef(onEvent);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  onEventRef.current = onEvent;

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) {
        return;
      }

      cleanup();

      const source = new EventSource('/api/events');
      sourceRef.current = source;

      source.onopen = () => {
        if (cancelled) {
          return;
        }

        reconnectAttemptsRef.current = 0;
        setState((current) => ({
          ...current,
          connected: true,
          reconnectAttempts: 0,
          error: ''
        }));
      };

      const handleEvent = (messageEvent: MessageEvent) => {
        if (cancelled) {
          return;
        }

        try {
          const parsed = JSON.parse(messageEvent.data) as RealtimeEvent;
          onEventRef.current?.(parsed);
          setState((current) => ({
            ...current,
            connected: true,
            lastEvent: parsed,
            error: ''
          }));
        } catch {
          // Ignore malformed SSE payloads.
        }
      };

      for (const eventName of EVENT_NAMES) {
        source.addEventListener(eventName, handleEvent);
      }

      source.onerror = () => {
        if (cancelled) {
          return;
        }

        source.close();
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, MAX_RECONNECT_DELAY);

        setState((current) => ({
          ...current,
          connected: false,
          reconnectAttempts: reconnectAttemptsRef.current,
          error: 'SSE disconnected. Reconnecting...'
        }));

        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return state;
}
