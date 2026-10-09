import { z } from 'zod';

function createIdSchema(resource: string): z.ZodType<number> {
  const invalid = `Invalid ${resource.toLowerCase()} ID`;
  return z.string({
    error: (issue): string => issue.input === undefined ? `${resource} ID is required` : invalid,
  })
    .min(1, `${resource} ID is required`)
    .regex(/^\d+$/, invalid)
    .transform(Number)
    .pipe(z.number().int(invalid).min(1, invalid).max(2147483647, invalid));
}

export const UserIdSchema = createIdSchema('User');
export const TeacherIdSchema = createIdSchema('Teacher');
