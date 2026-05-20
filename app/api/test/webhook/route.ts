import { NextResponse } from 'next/server';
import { processWebhookEvent } from '@/lib/webhook';
import { webhookEventSchema } from '@/lib/validation';

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

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Test webhook failed', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
