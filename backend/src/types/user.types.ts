import type { User } from '@prisma/client';

export type UserProfile = Omit<User, 'password'>;
export type AuthResponse = Pick<UserProfile, 'id' | 'email' | 'firstName' | 'lastName' | 'admin'> & { token: string };
