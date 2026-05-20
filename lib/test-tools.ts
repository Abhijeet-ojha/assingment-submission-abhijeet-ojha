import type { LeadCreateInput, WebhookEventInput } from '@/lib/validation';

export function buildConcurrentLeadPayloads(input: LeadCreateInput, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...input,
    email: input.email ? input.email.replace('@', `+${index}@`) : undefined,
    phone: `${input.phone}${index}`
  }));
}

export function buildDuplicateLeadPayload(input: LeadCreateInput) {
  return {
    ...input,
    city: input.city,
    description: input.description
  };
}

export function buildStressTestPayloads(input: LeadCreateInput, count = 10) {
  return buildConcurrentLeadPayloads(input, count).map((payload, index) => ({
    ...payload,
    city: `${payload.city} ${index + 1}`
  }));
}

export function buildWebhookReplayPayload(leadId: string, idempotencyKey: string, source = 'test-tools'): WebhookEventInput {
  return {
    idempotencyKey,
    eventType: 'lead.allocated',
    payload: {
      source,
      leadId
    }
  };
}

export function buildWebhookQuotaResetPayload(providerCodes: number[], monthKey: string, idempotencyKey: string) {
  return {
    idempotencyKey,
    eventType: 'provider.quota.reset',
    payload: {
      providerCodes,
      monthKey,
      source: 'test-tools'
    }
  } satisfies WebhookEventInput;
}
