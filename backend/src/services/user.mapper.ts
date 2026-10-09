import type { User } from '@prisma/client';
import type { UserProfile } from '../types/user.types';

// Password hashes never belong in a public profile.
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    admin: user.admin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
