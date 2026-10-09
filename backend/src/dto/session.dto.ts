import { z } from 'zod';

function requiredString(label: string): z.ZodString {
  return z.string({
    error: (issue): string => issue.input === undefined || issue.input === null
      ? `${label} is required`
      : `${label} must be a string`,
  }).min(1, `${label} is required`);
}

const dateSchema = requiredString('Date').pipe(z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true }),
], { error: 'Invalid date' })).refine(
  (value): boolean => value.slice(0, 4) !== '0000' && !Number.isNaN(new Date(value).getTime()),
  'Invalid date',
);

export const CreateSessionSchema = z.object({
  name: requiredString('Name').min(3, 'Name must be at least 3 characters').max(50, 'Name must be at most 50 characters'),
  date: dateSchema,
  description: requiredString('Description').max(2500, 'Description must be at most 2500 characters'),
  teacherId: z.number({
    error: (issue): string => issue.input === undefined || issue.input === null ? 'Teacher ID is required' : 'Invalid teacher ID',
  }).int('Invalid teacher ID').min(1, 'Invalid teacher ID').max(2147483647, 'Invalid teacher ID'),
});

// A partial update validates every provided field and keeps omitted fields unchanged.
export const UpdateSessionSchema = CreateSessionSchema.partial();

export type CreateSessionDto = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionDto = z.infer<typeof UpdateSessionSchema>;
