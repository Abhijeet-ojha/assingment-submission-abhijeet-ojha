import { NextResponse } from 'next/server';
import { emitRealtimeEvent } from '@/lib/events';
import { allocateLead } from '@/lib/allocation';
import { prisma } from '@/lib/prisma';
import { leadCreateSchema } from '@/lib/validation';
import { ApiError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = leadCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid lead payload', data: parsed.error.flatten() }, { status: 400 });
    }

    const result = await allocateLead(parsed.data);

    if (result.duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate lead detected.',
          data: {
            duplicate: true,
            monthKey: result.monthKey,
            lead: result.lead,
            assignments: result.lead.assignments
          }
        },
        { status: 409 }
      );
    }

      emitRealtimeEvent({
        type: 'lead.allocated',
        at: new Date().toISOString(),
        payload: {
          leadId: result.lead.id,
          serviceCode: result.lead.service.code,
          duplicate: result.duplicate
        }
      });

      emitRealtimeEvent({
        type: 'dashboard.refresh',
        at: new Date().toISOString(),
        payload: {
          reason: 'lead-allocation',
          leadId: result.lead.id
        }
      });

    return NextResponse.json(
      {
        success: true,
        data: {
          duplicate: false,
          monthKey: result.monthKey,
          lead: result.lead,
          assignments: result.lead.assignments
        }
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.statusCode });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'Malformed JSON body.' }, { status: 400 });
    }

    console.error('Lead allocation failed', error);
    return NextResponse.json({ success: false, error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 25,
    include: {
      service: true,
      assignments: {
        include: {
          provider: true,
          service: true
        },
        orderBy: {
          assignedAt: 'asc'
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      leads
    }
  });
}
