import { z } from 'zod';

export const serviceTypeSchema = z.enum(['SERVICE_1', 'SERVICE_2', 'SERVICE_3']);

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180).optional().nullable(),
  phone: z.string().trim().min(7).max(30),
  city: z.string().trim().min(2).max(120),
  description: z.string().trim().min(8).max(1000),
  serviceType: serviceTypeSchema,
  source: z.string().trim().max(120).optional()
});

export const webhookEventSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(180),
  eventType: z.string().trim().min(3).max(120).default('lead.allocated'),
  payload: z.record(z.any()).default({})
});

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

export function sanitizeLeadText(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;
