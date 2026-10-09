import type { SessionRecord, SessionResponse } from '../types/session.types';

// Public session data only needs participant IDs, not full user records.
export function toSessionResponse(session: SessionRecord): SessionResponse {
  return {
    id: session.id,
    name: session.name,
    date: session.date,
    description: session.description,
    teacher: {
      id: session.teacher.id,
      firstName: session.teacher.firstName,
      lastName: session.teacher.lastName,
    },
    users: session.participants.map((participation): number => participation.userId),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}
