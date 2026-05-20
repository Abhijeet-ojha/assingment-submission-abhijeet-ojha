import { onRealtimeEvent } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

function encodeEvent(eventType: string, payload: Record<string, unknown>) {
  return encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(request: Request) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('retry: 3000\n\n'));

      const unsubscribe = onRealtimeEvent((event) => {
        controller.enqueue(encodeEvent(event.type, event));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encodeEvent('ping', { at: new Date().toISOString() }));
      }, 15000);

      const abortHandler = () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener('abort', abortHandler, { once: true });
    },
    cancel() {
      // The abort handler above performs the cleanup.
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
