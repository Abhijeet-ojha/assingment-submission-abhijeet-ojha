import { NextResponse } from 'next/server';
import { emitRealtimeEvent } from '@/lib/events';
import { processWebhookEvent } from '@/lib/webhook';
import { webhookEventSchema } from '@/lib/validation';
import { ApiError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = webhookEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid webhook payload', data: parsed.error.flatten() }, { status: 400 });
    }

    const result = await processWebhookEvent(parsed.data);

    if (result.duplicate) {
      return NextResponse.json(
        { success: false, error: 'Webhook replay detected.', data: { duplicate: true, event: result.event } },
        { status: 409 }
      );
    }

    emitRealtimeEvent({
      type: 'lead.webhook',
      at: new Date().toISOString(),
      payload: {
        eventType: result.event.eventType,
        leadId: result.lead?.id ?? null
      }
    });

    emitRealtimeEvent({
      type: 'dashboard.refresh',
      at: new Date().toISOString(),
      payload: {
        reason: 'webhook-processed',
        eventType: result.event.eventType
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        duplicate: false,
        event: result.event,
        lead: result.lead
      }
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Malformed JSON body.' }, { status: 400 });
    }

    console.error('Webhook processing failed', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}
