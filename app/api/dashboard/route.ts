import { NextResponse } from 'next/server';
import { getMonthKey } from '@/lib/allocation';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const monthKey = getMonthKey();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [providers, usageRows, assignedCounts, assignedLeads, totalLeads, webhookEvents] = await Promise.all([
    prisma.provider.findMany({
      orderBy: {
        providerCode: 'asc'
      },
      include: {
        _count: {
          select: {
            assignments: true
          }
        },
        monthlyUsages: {
          where: {
            monthKey
          },
          select: {
            assignmentsCount: true,
            monthKey: true
          }
        }
      }
    }),
    prisma.providerMonthlyUsage.findMany({
      where: { monthKey },
      select: {
        providerId: true,
        assignmentsCount: true
      }
    }),
    prisma.leadAssignment.groupBy({
      by: ['providerId'],
      where: {
        assignedAt: {
          gte: monthStart
        }
      },
      _count: {
        _all: true
      }
    }),
    prisma.lead.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 15,
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
    }),
    prisma.lead.count(),
    prisma.webhookEvent.count()
  ]);

  const usageByProvider = new Map<number, number>(usageRows.map((row: typeof usageRows[number]) => [row.providerId, row.assignmentsCount]));
  const assignedByProvider = new Map<number, number>(assignedCounts.map((row: typeof assignedCounts[number]) => [row.providerId, row._count._all]));

  return NextResponse.json({
    success: true,
    data: {
      monthKey,
      summary: {
        totalLeads,
        currentMonthAssignments: assignedCounts.reduce((sum: number, row: typeof assignedCounts[number]) => sum + row._count._all, 0),
        webhookEvents,
        providersOnline: providers.filter((provider: typeof providers[number]) => provider.active).length
      },
      providers: providers.map((provider: typeof providers[number]) => {
        const monthUsage: number = usageByProvider.get(provider.id) ?? 0;
        return {
          id: provider.id,
          providerCode: provider.providerCode,
          name: provider.name,
          monthlyQuota: provider.monthlyQuota,
          active: provider.active,
          monthUsage,
          remainingQuota: Math.max((provider.monthlyQuota as number) - monthUsage, 0),
          assignedLeadsCount: assignedByProvider.get(provider.id) ?? 0,
          totalAssignments: provider._count.assignments
        };
      }),
      assignedLeads: assignedLeads.map((lead: typeof assignedLeads[number]) => ({
        id: lead.id,
        service: lead.service,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        description: lead.description,
        status: lead.status,
        createdAt: lead.createdAt,
        assignments: lead.assignments.map((assignment: typeof lead.assignments[number]) => ({
          providerCode: assignment.provider.providerCode,
          providerName: assignment.provider.name,
          service: assignment.service,
          assignedAt: assignment.assignedAt
        }))
      }))
    }
  });
}
