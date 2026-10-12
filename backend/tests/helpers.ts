import type { User, Teacher } from '@prisma/client';
import type { SessionRecord } from '../src/types/session.types';

export const user: User = { id: 1, email: 'unit@example.test', firstName: 'Test', lastName: 'User', password: 'hash', admin: false, createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
export const teacher: Teacher = { id: 1, firstName: 'Yoga', lastName: 'Teacher', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };
export const session: SessionRecord = { id: 1, name: 'Yoga practice', date: new Date('2026-10-12'), description: 'Relaxing practice', teacherId: 1, teacher, participants: [], createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01') };

// No cleanup is allowed unless the configuration points to the dedicated test database.
export function assertTestDatabase(): void {
  const url = new URL(process.env.DATABASE_URL || '');
  if (process.env.NODE_ENV !== 'test' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.port !== '5433' || url.pathname !== '/yogastudio_test') {
    throw new Error('Tests require the isolated yogastudio_test database on port 5433');
  }
}
