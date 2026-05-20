import type { Lead, WebhookEvent } from '@prisma/client';
import { prisma, Prisma } from '@/lib/prisma';
import type { WebhookEventInput } from '@/lib/validation';

export type WebhookProcessingResult = {
  event: WebhookEvent;
  lead: Lead | null;
  duplicate: boolean;
};

export class WebhookError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

function isRetryableTransactionError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? (error as { code?: string }).code : undefined;
  return code === 'P2034';
}

async function runSerializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      if (attempt < attempts && isRetryableTransactionError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('Transaction retries exhausted');
}

export async function processWebhookEvent(input: WebhookEventInput): Promise<WebhookProcessingResult> {
  const result = await runSerializableTransaction(async (tx) => {
    // Check for idempotent replay.
    const existingEvent = await tx.webhookEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });

    if (existingEvent) {
      // Webhook already processed; return stored event for idempotent response.
      return {
        event: existingEvent,
        lead: null,
        duplicate: true
      } satisfies WebhookProcessingResult;
    }

    // Validate that the lead exists if this is not a quota reset.
    const leadId = typeof input.payload.leadId === 'string' ? input.payload.leadId : null;
    const lead = leadId ? await tx.lead.findUnique({ where: { id: leadId } }) : null;
    if (!lead && input.eventType !== 'provider.quota.reset') {
      throw new WebhookError('Lead not found for webhook processing.', 404, 'LEAD_NOT_FOUND');
    }

    // Create webhook event record for idempotency tracking.
    const event = await tx.webhookEvent.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        eventType: input.eventType,
        payload: input.payload,
        status: 'processed',
        processedAt: new Date()
      }
    });

    // Handle quota resets.
    if (input.eventType === 'provider.quota.reset') {
      const monthKey = typeof input.payload.monthKey === 'string' ? input.payload.monthKey : null;
      const providerCodes = Array.isArray(input.payload.providerCodes)
        ? input.payload.providerCodes.filter((value): value is number => Number.isInteger(value))
        : [];

      if (monthKey && providerCodes.length > 0) {
        const providers = await tx.provider.findMany({
          where: {
            providerCode: {
              in: providerCodes
            }
          }
        });

        // Reset usage counters to 0 for the specified month.
        await Promise.all(
          providers.map((provider) =>
            tx.providerMonthlyUsage.upsert({
              where: {
                providerId_monthKey: {
                  providerId: provider.id,
                  monthKey
                }
              },
              create: {
                providerId: provider.id,
                monthKey,
                assignmentsCount: 0
              },
              update: {
                assignmentsCount: 0
              }
            })
          )
        );
      }
    }

    return {
      event,
      lead,
      duplicate: false
    } satisfies WebhookProcessingResult;
  });


  return result;
}
