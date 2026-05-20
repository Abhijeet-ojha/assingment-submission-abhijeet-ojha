import { NextResponse } from 'next/server';

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      error?: never;
    }
  | {
      success: false;
      data?: T;
      error: string;
    };

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function apiFailure(message: string, status = 400, data?: unknown) {
  const payload = data === undefined ? { success: false, error: message } : { success: false, data, error: message };
  return NextResponse.json(payload, { status });
}
