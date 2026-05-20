import { Prisma, type Lead, type LeadAssignment, type Provider, type Service, type ServiceCode } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { serviceLabels } from '@/lib/service-labels';
import { normalizePhone, sanitizeLeadText, type LeadCreateInput } from '@/lib/validation';
import { AllocationError } from '@/lib/errors';


export const serviceRules: Record<
  ServiceCode,
  {
    mandatoryProviderCodes: number[];
    fairProviderCodes: number[];
    totalAssignments: number;
  }
> = {
  SERVICE_1: {
    mandatoryProviderCodes: [1],
    fairProviderCodes: [2, 3, 4],
    totalAssignments: 3
  },
  SERVICE_2: {
    mandatoryProviderCodes: [5],
    fairProviderCodes: [6, 7, 8],
    totalAssignments: 3
  },
  SERVICE_3: {
    mandatoryProviderCodes: [1, 4],
    fairProviderCodes: [2, 3, 5, 6, 7, 8],
    totalAssignments: 3
  }
};

export type AllocationResult = {
  lead: Lead & {
    service: Service;
    assignments: (LeadAssignment & {
      provider: Provider;
      service: Service;
    })[];
  };
  duplicate: boolean;
  monthKey: string;
};

function isRetryableTransactionError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? (error as { code?: string }).code : undefined;
  return code === 'P2034';
}

async function runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  const attempts = 5;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (attempt < attempts && isRetryableTransactionError(error)) {
        // small exponential backoff to reduce write contention
        const backoffMs = 25 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Transaction retries exhausted');
}

function rotate<T>(items: T[], offset: number) {
  if (items.length === 0) {
    return items;
  }

  const safeOffset = offset % items.length;
  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

function sortProvidersByCode(providers: Provider[]) {
  return [...providers].sort((left, right) => left.providerCode - right.providerCode);
}

async function loadLeadWithRelations(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
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
}

async function loadLeadWithRelationsTx(tx: Prisma.TransactionClient, leadId: string) {
  return tx.lead.findUnique({
    where: { id: leadId },
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
}

export function getMonthKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

export async function allocateLead(input: LeadCreateInput): Promise<AllocationResult> {
  const monthKey = getMonthKey();
  const serviceCode = input.serviceType as ServiceCode;
  const normalizedPhone = normalizePhone(input.phone);

  const result = await runSerializableTransaction(async (tx) => {
    const service = await tx.service.findUnique({
      where: { code: serviceCode }
    });

    if (!service || !service.active) {
      throw new AllocationError('Requested service is unavailable.', 409, 'SERVICE_UNAVAILABLE');
    }

    // Check for duplicate by composite (phone, serviceId) constraint.
    const existingLead = await tx.lead.findUnique({
      where: {
        phone_serviceId: {
          phone: normalizedPhone,
          serviceId: service.id
        }
      }
    });

    if (existingLead) {
      const loadedLead = await loadLeadWithRelations(existingLead.id);
      if (!loadedLead) {
        throw new AllocationError('Duplicate lead detected but existing record could not be loaded.', 409, 'LEAD_DUPLICATE_LOOKUP_FAILED');
      }

      return {
        lead: loadedLead,
        duplicate: true,
        monthKey
      } satisfies AllocationResult;
    }

    const rule = serviceRules[service.code];
    const providerCodes = [...rule.mandatoryProviderCodes, ...rule.fairProviderCodes];
    const providers = sortProvidersByCode(
      await tx.provider.findMany({
        where: {
          providerCode: {
            in: providerCodes
          },
          active: true
        }
      })
    );

    const providerByCode = new Map(providers.map((provider) => [provider.providerCode, provider]));
    const mandatoryProviders = rule.mandatoryProviderCodes.map((providerCode) => providerByCode.get(providerCode));
    const fairProviders = rule.fairProviderCodes.map((providerCode) => providerByCode.get(providerCode));

    if (mandatoryProviders.some((provider) => !provider)) {
      throw new AllocationError('One or more mandatory providers are unavailable.', 409, 'MANDATORY_PROVIDER_MISSING');
    }

    if (fairProviders.some((provider) => !provider)) {
      throw new AllocationError('One or more fair-pool providers are unavailable.', 409, 'FAIR_PROVIDER_MISSING');
    }

    const mandatory = mandatoryProviders as Provider[];
    const fairPool = fairProviders as Provider[];
    const mandatoryIds = new Set(mandatory.map((provider) => provider.id));

    const usageRows = await tx.providerMonthlyUsage.findMany({
      where: {
        monthKey,
        providerId: {
          in: providers.map((provider) => provider.id)
        }
      }
    });

    const usageByProviderId = new Map(usageRows.map((row) => [row.providerId, row.assignmentsCount]));

    for (const provider of mandatory) {
      const currentUsage = usageByProviderId.get(provider.id) ?? 0;
      if (currentUsage >= provider.monthlyQuota) {
        throw new AllocationError(`Mandatory provider ${provider.providerCode} has reached the monthly quota.`, 409, 'MANDATORY_QUOTA_EXCEEDED');
      }
    }

    const cursor = await tx.allocationCursor.upsert({
      where: { serviceId: service.id },
      create: { serviceId: service.id, nextIndex: 0 },
      update: {}
    });

    const fairSlots = rule.totalAssignments - mandatory.length;
    const rotatedFairPool = rotate(fairPool, cursor.nextIndex);
    const selectedFairProviders: Provider[] = [];
    let lastSelectedOffset = -1;

    for (let offset = 0; offset < rotatedFairPool.length && selectedFairProviders.length < fairSlots; offset += 1) {
      const provider = rotatedFairPool[offset];
      if (mandatoryIds.has(provider.id)) {
        continue;
      }

      const currentUsage = usageByProviderId.get(provider.id) ?? 0;
      if (currentUsage >= provider.monthlyQuota) {
        continue;
      }

      selectedFairProviders.push(provider);
      lastSelectedOffset = offset;
    }

    if (selectedFairProviders.length !== fairSlots) {
      throw new AllocationError('Not enough capacity in the fair pool for this service.', 409, 'FAIR_CAPACITY_EXHAUSTED');
    }

    const assignedProviders = [...mandatory, ...selectedFairProviders];

    if (assignedProviders.length !== rule.totalAssignments) {
      throw new AllocationError(
        `Allocation invariant violated: expected ${rule.totalAssignments} providers but selected ${assignedProviders.length}.`,
        500,
        'ALLOCATION_INVARIANT_FAILED'
      );
    }

    const nextIndex = fairPool.length > 0 ? (cursor.nextIndex + lastSelectedOffset + 1) % fairPool.length : 0;

    const lead = await tx.lead.create({
      data: {
        serviceId: service.id,
        name: sanitizeLeadText(input.name),
        email: input.email ? input.email.trim().toLowerCase() : null,
        phone: normalizedPhone,
        city: sanitizeLeadText(input.city),
        description: sanitizeLeadText(input.description),
        status: 'ALLOCATED'
      }
    });

    await tx.leadAssignment.createMany({
      data: assignedProviders.map((provider) => ({
        leadId: lead.id,
        providerId: provider.id,
        serviceId: service.id
      }))
    });

    for (const provider of assignedProviders) {
      await tx.providerMonthlyUsage.upsert({
        where: {
          providerId_monthKey: {
            providerId: provider.id,
            monthKey
          }
        },
        create: {
          providerId: provider.id,
          monthKey,
          assignmentsCount: 1
        },
        update: {
          assignmentsCount: {
            increment: 1
          }
        }
      });
    }

    await tx.allocationCursor.update({
      where: { serviceId: service.id },
      data: {
        nextIndex
      }
    });

    const enrichedLead = await loadLeadWithRelationsTx(tx, lead.id);
    if (!enrichedLead) {
      throw new AllocationError('Lead was created but could not be reloaded.', 500, 'LEAD_RELOAD_FAILED');
    }

    return {
      lead: enrichedLead,
      duplicate: false,
      monthKey
    } satisfies AllocationResult;
  });


  return result;
}
