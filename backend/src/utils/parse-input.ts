import type { ZodType } from 'zod';
import { AppError } from './app-error';

// Only validated, typed values may enter the services.
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(result.error.issues[0]?.message || 'Invalid request', 400);
  }
  return result.data;
}
