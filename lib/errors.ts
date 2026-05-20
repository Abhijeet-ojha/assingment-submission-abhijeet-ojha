export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
    this.name = 'ValidationError';
  }
}

export class DuplicateLeadError extends ApiError {
  constructor(message = 'Duplicate lead detected.') {
    super(message, 409, 'DUPLICATE_LEAD');
    this.name = 'DuplicateLeadError';
  }
}

export class QuotaExceededError extends ApiError {
  constructor(message = 'Provider quota exceeded.') {
    super(message, 409, 'QUOTA_EXCEEDED');
    this.name = 'QuotaExceededError';
  }
}

export class AllocationError extends ApiError {
  constructor(message: string, statusCode = 400, code = 'ALLOCATION_ERROR') {
    super(message, statusCode, code);
    this.name = 'AllocationError';
  }
}

export class WebhookReplayError extends ApiError {
  constructor(message = 'Webhook replay detected.') {
    super(message, 409, 'WEBHOOK_REPLAY');
    this.name = 'WebhookReplayError';
  }
}
