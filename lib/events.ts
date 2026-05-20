import { EventEmitter } from 'node:events';

export type RealtimeEvent = {
  type: 'lead.allocated' | 'lead.webhook' | 'dashboard.refresh';
  at: string;
  payload: Record<string, unknown>;
};

type RealtimeHub = {
  emitter: EventEmitter;
};

const globalForEvents = globalThis as unknown as {
  leadDistributionEvents?: RealtimeHub;
};

function getRealtimeHub(): RealtimeHub {
  if (!globalForEvents.leadDistributionEvents) {
    globalForEvents.leadDistributionEvents = {
      emitter: new EventEmitter()
    };
    globalForEvents.leadDistributionEvents.emitter.setMaxListeners(0);
  }

  return globalForEvents.leadDistributionEvents;
}

export function emitRealtimeEvent(event: RealtimeEvent) {
  getRealtimeHub().emitter.emit('update', event);
}

export function onRealtimeEvent(listener: (event: RealtimeEvent) => void) {
  const hub = getRealtimeHub();
  hub.emitter.on('update', listener);
  return () => hub.emitter.off('update', listener);
}
