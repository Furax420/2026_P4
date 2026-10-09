import { z } from 'zod';

function requiredString(label: string): z.ZodString {
  return z.string({
    error: (issue): string => issue.input === undefined || issue.input === null
      ? `${label} is required`
      : `${label} must be a string`,
  }).min(1, `${label} is required`);
}

const emailSchema = requiredString('Email')
  .max(50, 'Email must be at most 50 characters')
  .pipe(z.email({ error: 'Invalid email' }));

export const LoginSchema = z.object({
  email: emailSchema,
  password: requiredString('Password').min(6, 'Password must be at least 6 characters'),
});

export const RegisterSchema = z.object({
  email: emailSchema,
  password: requiredString('Password').min(8, 'Password must be at least 8 characters'),
  firstName: requiredString('First name')
    .min(2, 'First name must be at least 2 characters')
    .max(20, 'First name must be at most 20 characters'),
  lastName: requiredString('Last name')
    .min(2, 'Last name must be at least 2 characters')
    .max(20, 'Last name must be at most 20 characters'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
