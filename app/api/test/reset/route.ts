import { NextResponse } from 'next/server';
import { processWebhookEvent } from '@/lib/webhook';
import { buildWebhookQuotaResetPayload } from '@/lib/test-tools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const providerCodes = Array.isArray(body.providerCodes) ? body.providerCodes : [];
    const monthKey = typeof body.monthKey === 'string' ? body.monthKey : new Date().toISOString().slice(0, 7);
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : crypto.randomUUID();

    const payload = buildWebhookQuotaResetPayload(providerCodes, monthKey, idempotencyKey);
    const result = await processWebhookEvent(payload as any);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Reset test failed', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
