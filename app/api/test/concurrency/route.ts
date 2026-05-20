import { NextResponse } from 'next/server';
import { allocateLead } from '@/lib/allocation';
import { buildConcurrentLeadPayloads } from '@/lib/test-tools';
import type { LeadCreateInput } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body.count === 'number' && body.count > 0 ? Math.min(500, Math.floor(body.count)) : 10;
    const input = (body.input ?? {}) as LeadCreateInput;

    // Build payloads and run allocation on the server-side using the central logic.
    const payloads = buildConcurrentLeadPayloads(input, count);

    const results = await Promise.all(
      payloads.map(async (payload) => {
        try {
          const result = await allocateLead(payload as LeadCreateInput);
          return { success: true, data: result };
        } catch (error: any) {
          return { success: false, error: error?.message ?? String(error) };
        }
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Concurrency test failed', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
